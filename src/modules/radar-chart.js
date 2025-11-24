/**
 * Radar Chart Module
 * Clean single canvas with multi-year support, straight polygons, and improved hover feedback
 */

import { wrapText } from './utils.js';
import { renderEmptyState } from './empty-state.js';

const GRID_LEVELS = 4;
const MAX_DEFAULT_VISIBLE_YEARS = 3;
const FILL_OPACITY = 0.14;
const MARKER_RADIUS = 4;
const HIT_RADIUS = 18;
const MIN_CHART_SIZE = 360;
const MAX_CHART_SIZE = 560;
const DEFAULT_COLORS = ['#2563eb', '#d97706', '#0ea5e9', '#16a34a', '#9333ea'];

let currentCountry = 'Portugal';

export function createRadarChart(data, selectedYears, country = 'Portugal') {
    currentCountry = country;
    const container = d3.select('#viz-inflation-categories');
    container.html('');

    if (!data || !data.categories?.length) {
        container.html(
            renderEmptyState({
                title: 'Sem dados de categorias',
                message: 'Não encontrámos categorias suficientes para desenhar o radar.',
                meta: 'Garanta que os ficheiros de inflação estão carregados.',
                icon: '🕸️',
            }),
        );
        return;
    }

    if (!selectedYears?.length) {
        container.html(
            renderEmptyState({
                title: 'Selecione pelo menos um ano',
                message: 'Ative um ou mais anos para comparar a inflação por categoria.',
                meta: 'Pode combinar anos consecutivos ou comparar décadas distintas.',
                icon: '📅',
            }),
        );
        return;
    }

    const categories = data.categories.filter((category) => category.name !== 'Total');
    if (!categories.length) {
        container.html(
            renderEmptyState({
                title: 'Sem categorias específicas',
                message: 'Apenas encontramos o valor total da inflação.',
                meta: 'Adicione categorias como "Alimentação" ou "Transportes" para esta vista.',
                icon: '🎯',
            }),
        );
        return;
    }

    const series = selectedYears.map((year) => {
        const values = categories.map((category) => {
            const match = category.values.find((point) => point.year === year);
            return {
                category: category.name,
                value: Number.isFinite(match?.value) ? match.value : 0,
            };
        });
        return { year, values, color: getColorForYear(year) };
    });

    const allValues = series.flatMap((s) => s.values.map((v) => v.value));
    const extent = d3.extent(allValues);
    const domainMin = Math.min(0, extent[0] ?? 0);
    const domainMax = extent[1] === extent[0] ? (extent[1] ?? 0) + 1 : extent[1] ?? 0;

    const wrapper = container.append('div').attr('class', 'radar-chart-wrapper');

    const pill = wrapper.append('div').attr('class', 'radar-year-pill');
    pill
        .append('span')
        .attr('class', 'radar-year-pill-label')
        .text(
            selectedYears.length === 1
                ? `A mostrar ${selectedYears[0]}`
                : `A mostrar ${selectedYears.length} anos`,
        );

    const tagList = pill.append('div').attr('class', 'radar-year-tags');
    series.forEach((serie) => {
        tagList
            .append('span')
            .attr('class', 'radar-year-tag')
            .style('--year-color', serie.color)
            .text(serie.year);
    });

    const wrapperBounds = wrapper.node().getBoundingClientRect();
    const squareSize = clamp(
        wrapperBounds.width ? wrapperBounds.width : MIN_CHART_SIZE,
        MIN_CHART_SIZE,
        MAX_CHART_SIZE,
    );
    const margin = 36;
    const radius = squareSize / 2 - margin;

    const svg = wrapper
        .append('svg')
        .attr('class', 'radar-svg')
        .attr('viewBox', `0 0 ${squareSize} ${squareSize}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const root = svg.append('g').attr('transform', `translate(${squareSize / 2}, ${squareSize / 2})`);

    const tooltip = wrapper
        .append('div')
        .attr('class', 'radar-tooltip')
        .style('opacity', 0)
        .style('pointer-events', 'none');

    const angleSlice = (Math.PI * 2) / categories.length;
    const rScale = d3.scaleLinear().domain([domainMin, domainMax]).range([0, radius]);

    drawGrid(root, radius, domainMin, domainMax);
    drawAxes(root, categories, angleSlice, radius);

    const radialLine = d3
        .lineRadial()
        .radius((d) => rScale(d.value))
        .angle((_d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

    const seriesGroup = root.append('g').attr('class', 'radar-series-group');
    const pointGroup = root.append('g').attr('class', 'radar-points');

    let hoveredYear = null;
    let focusedYear = null;

    const updateSeriesFocus = () => {
        seriesGroup
            .selectAll('.radar-series')
            .classed('is-dimmed', function () {
                const year = +d3.select(this).attr('data-year');
                if (focusedYear) {
                    return year !== focusedYear;
                }
                if (hoveredYear) {
                    return year !== hoveredYear;
                }
                return false;
            });

        pointGroup
            .selectAll('.radar-point')
            .classed('is-dimmed', function () {
                const year = +d3.select(this).attr('data-year');
                if (focusedYear) {
                    return year !== focusedYear;
                }
                if (hoveredYear) {
                    return year !== hoveredYear;
                }
                return false;
            });
    };

    const toggleFocus = (year) => {
        focusedYear = focusedYear === year ? null : year;
        hoveredYear = null;
        updateSeriesFocus();
    };

    const formatter = d3.format('.1f');

    const showTooltip = (event, payload) => {
        const [mouseX, mouseY] = d3.pointer(event, wrapper.node());
        tooltip
            .style('opacity', 1)
            .style('left', `${mouseX}px`)
            .style('top', `${mouseY - 24}px`)
            .html(
                `<strong>${payload.category}</strong><span>${formatter(payload.value)}% · ${payload.year}</span>`,
            );
    };

    const hideTooltip = () => {
        tooltip.transition().duration(120).style('opacity', 0);
    };

    series.forEach((serie) => {
        const group = seriesGroup.append('g').attr('class', 'radar-series').attr('data-year', serie.year);

        group
            .append('path')
            .datum(serie.values)
            .attr('class', 'radar-fill')
            .attr('d', radialLine)
            .attr('fill', serie.color)
            .attr('fill-opacity', FILL_OPACITY);

        group
            .append('path')
            .datum(serie.values)
            .attr('class', 'radar-line')
            .attr('d', radialLine)
            .attr('stroke', serie.color)
            .attr('stroke-width', 2)
            .attr('fill', 'none');

        const points = pointGroup
            .selectAll(null)
            .data(
                serie.values.map((value, idx) => ({
                    ...value,
                    angleIndex: idx,
                    color: serie.color,
                    year: serie.year,
                })),
            )
            .enter()
            .append('g')
            .attr('class', 'radar-point')
            .attr('data-year', serie.year)
            .attr('transform', (d) => {
                const angle = angleSlice * d.angleIndex - Math.PI / 2;
                const x = rScale(d.value) * Math.cos(angle);
                const y = rScale(d.value) * Math.sin(angle);
                return `translate(${x}, ${y})`;
            });

        points
            .append('circle')
            .attr('class', 'radar-marker-hit')
            .attr('r', HIT_RADIUS)
            .attr('fill', 'transparent');

        points
            .append('circle')
            .attr('class', 'radar-marker')
            .attr('r', MARKER_RADIUS)
            .attr('fill', '#fff')
            .attr('stroke', (d) => d.color)
            .attr('stroke-width', 2);

        points
            .on('pointerenter', function () {
                d3.select(this).select('.radar-marker').classed('is-active', true);
                hoveredYear = serie.year;
                updateSeriesFocus();
            })
            .on('pointerleave', function () {
                hideTooltip();
                d3.select(this).select('.radar-marker').classed('is-active', false);
                hoveredYear = null;
                updateSeriesFocus();
            })
            .on('pointermove', function (event, datum) {
                showTooltip(event, datum);
            })
            .on('click', (event) => {
                event.stopPropagation();
                toggleFocus(serie.year);
            });

        group
            .on('pointerenter', () => {
                hoveredYear = serie.year;
                updateSeriesFocus();
            })
            .on('pointerleave', () => {
                hoveredYear = null;
                updateSeriesFocus();
            })
            .on('click', (event) => {
                event.stopPropagation();
                toggleFocus(serie.year);
            })
            .on('pointermove', (event) => {
                const centroid = d3.pointer(event, wrapper.node());
                tooltip.style('left', `${centroid[0]}px`).style('top', `${centroid[1] - 24}px`);
            });
    });

    wrapper
        .append('p')
        .attr('class', 'radar-hint')
        .html('Passe o rato pelos vértices para ver o valor em cada categoria.');

    wrapper.on('click', () => {
        if (focusedYear) {
            focusedYear = null;
            updateSeriesFocus();
        }
    });

    updateSeriesFocus();
}

export function setupYearSelection(data, onUpdateCallback, country = 'Portugal') {
    currentCountry = country;
    const yearContainer = d3.select('#year-checkboxes');
    yearContainer.html('');

    const allYears = data.years || [];
    const recentYears = allYears.filter((y) => y >= 2000);
    const olderYears = allYears.filter((y) => y < 2000 && y % 10 === 0);
    const displayYears = [...olderYears, ...recentYears].sort((a, b) => b - a);

    const defaultYears = determineDefaultYears(recentYears.length ? recentYears : displayYears);

    displayYears.forEach((year) => {
        const item = yearContainer.append('label').attr('class', 'year-checkbox-item');

        const checkbox = item
            .append('input')
            .attr('type', 'checkbox')
            .attr('value', year)
            .property('checked', defaultYears.includes(year));

        item.append('span').text(year);

        checkbox.on('change', function () {
            if (onUpdateCallback) {
                onUpdateCallback(data);
            }
        });
    });

    if (onUpdateCallback) {
        onUpdateCallback(data);
    }
}

export function updateRadarChart(data) {
    const selectedYears = [];
    d3.selectAll('#year-checkboxes input:checked').each(function () {
        selectedYears.push(+d3.select(this).attr('value'));
    });

    if (!selectedYears.length) {
        d3.select('#viz-inflation-categories').html(
            renderEmptyState({
                title: 'Selecione pelo menos um ano',
                message: 'Escolha um ou mais anos para comparar a inflação por categoria.',
                meta: 'Pode combinar anos recentes com décadas anteriores para ver tendências.',
                icon: '🗂️',
            }),
        );
        return;
    }

    createRadarChart(data, selectedYears.sort((a, b) => a - b), currentCountry);
}

function drawGrid(root, radius, minValue, maxValue) {
    const grid = root.append('g').attr('class', 'radar-grid');
    d3.range(1, GRID_LEVELS + 1).forEach((level) => {
        const fraction = level / GRID_LEVELS;
        const levelRadius = radius * fraction;
        grid
            .append('circle')
            .attr('class', 'radar-grid-ring')
            .attr('r', levelRadius);

        const value = minValue + (maxValue - minValue) * fraction;
        grid
            .append('text')
            .attr('class', 'radar-grid-label')
            .attr('y', -levelRadius)
            .attr('x', 8)
            .text(`${value.toFixed(1)}%`);
    });
}

function drawAxes(root, categories, angleSlice, radius) {
    const axisGroup = root.append('g').attr('class', 'radar-axes');
    const LABEL_PADDING_X = 12;
    const LABEL_PADDING_Y = 6;

    categories.forEach((category, idx) => {
        const angle = angleSlice * idx - Math.PI / 2;
        const lineCoord = {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
        };

        axisGroup
            .append('line')
            .attr('class', 'radar-axis-line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', lineCoord.x)
            .attr('y2', lineCoord.y);

        const labelCoord = {
            x: (radius + 20) * Math.cos(angle),
            y: (radius + 20) * Math.sin(angle),
        };

        const labelGroup = axisGroup
            .append('g')
            .attr('class', 'radar-axis-label')
            .attr('transform', `translate(${labelCoord.x}, ${labelCoord.y})`);

        const text = labelGroup
            .append('text')
            .attr('class', 'radar-axis-label-text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .text(category.name);

        text.call(wrapText, 110);

        const bbox = text.node().getBBox();
        labelGroup
            .insert('rect', 'text')
            .attr('class', 'radar-axis-label-bg')
            .attr('x', bbox.x - LABEL_PADDING_X)
            .attr('y', bbox.y - LABEL_PADDING_Y)
            .attr('width', bbox.width + LABEL_PADDING_X * 2)
            .attr('height', bbox.height + LABEL_PADDING_Y * 2)
            .attr('rx', 12)
            .attr('ry', 12);
    });
}

function determineDefaultYears(years) {
    if (!years.length) {
        return [];
    }
    const sorted = [...years].sort((a, b) => a - b);
    const take = Math.min(MAX_DEFAULT_VISIBLE_YEARS, sorted.length);
    return sorted.slice(-take);
}

function getColorForYear(year) {
    const paletteIdx = Math.abs(year) % DEFAULT_COLORS.length;
    return DEFAULT_COLORS[paletteIdx];
}
