/**
 * Radar Chart Module
 * Creates radar/spider charts for comparing inflation across categories
 */

/**
 * Radar Chart Module
 * Less clutter (limited defaults, thin lines, subtle grid), better colors (color-blind palette), improved labels & interactivity (inline tags, hover/focus tooltips)
 */

import { wrapText } from './utils.js';
import { renderEmptyState } from './empty-state.js';

const YEAR_COLOR_PALETTE = [
    '#1b70fc',
    '#d97706',
    '#8b5cf6',
    '#059669',
    '#be185d',
    '#0ea5e9',
    '#b45309',
    '#6d28d9',
];
const GRID_LEVELS = 5;
const MAX_DEFAULT_VISIBLE_YEARS = 3;
const LIGHT_FILL_OPACITY = 0.08;
const MARKER_RADIUS = 4;

let currentCountry = 'Portugal';

/**
 * Create radar chart for inflation by category with improved heuristics
 */
export function createRadarChart(data, selectedYears, country = 'Portugal') {
    currentCountry = country;
    const container = d3.select('#viz-inflation-categories');
    container.html('');

    const categories = data.categories.filter((c) => c.name !== 'Total');

    if (categories.length === 0) {
        container.html(
            renderEmptyState({
                title: 'Sem categorias disponíveis',
                message: 'Não há dados suficientes para construir o radar de inflação por categoria.',
                meta: 'Verifique se a base inclui valores além do total.',
                icon: '🕸️',
            }),
        );
        return;
    }

    if (!selectedYears || selectedYears.length === 0) {
        container.html(
            renderEmptyState({
                title: 'Selecione pelo menos um ano',
                message: 'Escolha um ou mais anos para comparar a inflação por categoria.',
                meta: 'Pode combinar anos recentes com décadas anteriores para ver tendências.',
                icon: '🗂️',
            }),
        );
        return;
    }

    const wrapper = container.append('div').attr('class', 'radar-chart-wrapper');

    const margin = { top: 60, right: 180, bottom: 60, left: 180 };
    const bounds = wrapper.node().getBoundingClientRect();
    const innerWidth = Math.max(320, bounds.width - margin.left - margin.right);
    const innerHeight = 520 - margin.top - margin.bottom;
    const radius = Math.min(innerWidth, innerHeight) / 2;

    const svg = wrapper
        .append('svg')
        .attr('width', innerWidth + margin.left + margin.right)
        .attr('height', innerHeight + margin.top + margin.bottom);

    const root = svg
        .append('g')
        .attr('transform', `translate(${margin.left + innerWidth / 2},${margin.top + innerHeight / 2})`);

    const tooltip = wrapper.append('div').attr('class', 'radar-tooltip').style('opacity', 0);

    const radarData = selectedYears.map((year) => {
        const values = categories.map((category) => {
            const point = category.values.find((v) => v.year === year);
            return {
                category: category.name,
                value: point ? point.value : 0,
            };
        });
        return { year, values };
    });

    const allValues = radarData.flatMap((d) => d.values.map((v) => v.value));
    const maxValue = d3.max(allValues) ?? 0;
    const minValue = d3.min(allValues) ?? 0;
    const domainMin = minValue < 0 ? minValue : 0;
    const domainMax = maxValue === domainMin ? domainMin + 1 : maxValue;

    const angleSlice = (Math.PI * 2) / categories.length;
    const rScale = d3.scaleLinear().domain([domainMin, domainMax]).range([0, radius]);

    const colorScale = d3
        .scaleOrdinal()
        .domain(selectedYears)
        .range([...YEAR_COLOR_PALETTE, ...d3.schemeTableau10]);

    drawGrid(root, radius, domainMin, domainMax);
    drawAxes(root, categories, angleSlice, radius);

    const seriesGroup = root.append('g').attr('class', 'radar-series-group');
    const inlineLabelGroup = root.append('g').attr('class', 'radar-inline-labels');
    const inlineLabelData = [];

    const radarLine = d3
        .lineRadial()
        .radius((point) => rScale(point.value))
        .angle((_point, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

    let focusedYear = null;
    let hoveredYear = null;

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

        inlineLabelGroup
            .selectAll('text')
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

    const showTooltip = (event, payload) => {
        const [mouseX, mouseY] = d3.pointer(event, wrapper.node());
        tooltip
            .style('opacity', 1)
            .style('left', `${mouseX + 15}px`)
            .style('top', `${mouseY - 10}px`)
            .html(`<strong>${payload.year}</strong> · ${payload.category}<br>${payload.value.toFixed(2)}%`);
    };

    const hideTooltip = () => tooltip.transition().duration(150).style('opacity', 0);

    radarData.forEach((yearData) => {
        const color = colorScale(yearData.year);
        const series = seriesGroup.append('g').attr('class', 'radar-series').attr('data-year', yearData.year);

        series
            .append('path')
            .datum(yearData.values)
            .attr('class', 'radar-fill')
            .attr('d', radarLine)
            .attr('fill', color)
            .attr('fill-opacity', LIGHT_FILL_OPACITY);

        series
            .append('path')
            .datum(yearData.values)
            .attr('class', 'radar-line')
            .attr('d', radarLine)
            .attr('stroke', color)
            .attr('stroke-width', 2.5)
            .attr('fill', 'none');

        series
            .selectAll('.radar-marker')
            .data(yearData.values)
            .enter()
            .append('circle')
            .attr('class', 'radar-marker')
            .attr('r', MARKER_RADIUS)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .attr('fill', color)
            .attr('cx', (_d, i) => rScale(yearData.values[i].value) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr('cy', (_d, i) => rScale(yearData.values[i].value) * Math.sin(angleSlice * i - Math.PI / 2))
            .on('mousemove', (event, point) => {
                showTooltip(event, { ...point, year: yearData.year });
                hoveredYear = yearData.year;
                updateSeriesFocus();
            })
            .on('mouseleave', () => {
                hideTooltip();
                hoveredYear = null;
                updateSeriesFocus();
            });

        series
            .on('mouseenter', () => {
                hoveredYear = yearData.year;
                updateSeriesFocus();
            })
            .on('mouseleave', () => {
                hoveredYear = null;
                updateSeriesFocus();
            })
            .on('click', (event) => {
                event.stopPropagation();
                toggleFocus(yearData.year);
            });

        const maxPointIndex = yearData.values.reduce(
            (acc, point, idx) => (point.value > acc.value ? { value: point.value, idx } : acc),
            { value: Number.NEGATIVE_INFINITY, idx: 0 },
        ).idx;
        const maxPoint = yearData.values[maxPointIndex];
        const labelRadius = rScale(maxPoint.value);
        const angle = angleSlice * maxPointIndex - Math.PI / 2;
        const labelX = (labelRadius + 18) * Math.cos(angle);
        const labelY = (labelRadius + 18) * Math.sin(angle);

        inlineLabelData.push({
            year: yearData.year,
            x: labelX,
            y: labelY,
            color,
            priority: yearData.year === d3.max(selectedYears) ? 2 : 1,
        });
    });

    const resolvedLabels = resolveLabelPositions(inlineLabelData, radius);

    inlineLabelGroup
        .selectAll('text')
        .data(resolvedLabels)
        .enter()
        .append('text')
        .attr('class', (d) => `radar-inline-label${d.hidden ? ' hidden' : ''}`)
        .attr('data-year', (d) => d.year)
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y)
        .attr('fill', (d) => d.color)
        .text((d) => d.year)
        .on('click', (event, d) => {
            event.stopPropagation();
            toggleFocus(d.year);
        });

    const legend = svg
        .append('g')
        .attr('class', 'radar-legend')
        .attr('transform', `translate(${margin.left + innerWidth / 2 + radius + 40}, ${margin.top - radius})`);

    const legendItems = legend
        .selectAll('.legend-item')
        .data(selectedYears)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (_d, i) => `translate(0, ${i * 26})`)
        .on('mouseenter', (_event, year) => {
            hoveredYear = year;
            updateSeriesFocus();
        })
        .on('mouseleave', () => {
            hoveredYear = null;
            updateSeriesFocus();
        })
        .on('click', (event, year) => {
            event.stopPropagation();
            toggleFocus(year);
        });

    legendItems
        .append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 9)
        .attr('y2', 9)
        .attr('stroke', (year) => colorScale(year))
        .attr('stroke-width', 3);

    legendItems
        .append('circle')
        .attr('cx', 10)
        .attr('cy', 9)
        .attr('r', 4)
        .attr('fill', (year) => colorScale(year))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.2);

    legendItems
        .append('text')
        .attr('x', 28)
        .attr('y', 12)
        .text((year) => year)
        .attr('fill', '#0f172a')
        .attr('font-size', '12px')
        .attr('font-weight', 600);

    const countryNames = {
        Portugal: 'Portugal',
        Espanha: 'Espanha',
        France: 'França',
        Alemanha: 'Alemanha',
    };
    const displayCountry = countryNames[currentCountry] || currentCountry;

    svg
        .append('text')
        .attr('x', (innerWidth + margin.left + margin.right) / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('font-weight', 'bold')
        .attr('fill', '#1f2937')
        .text(`Taxa de Inflação por Categoria - ${displayCountry}`);

    svg.on('click', () => {
        if (focusedYear) {
            focusedYear = null;
            updateSeriesFocus();
        }
    });

    updateSeriesFocus();
}

/**
 * Setup year selection checkboxes with limited default selections
 */
export function setupYearSelection(data, onUpdateCallback, country = 'Portugal') {
    currentCountry = country;
    const yearContainer = d3.select('#year-checkboxes');
    yearContainer.html('');

    const allYears = data.years;
    const recentYears = allYears.filter((y) => y >= 2000);
    const olderYears = allYears.filter((y) => y < 2000 && y % 10 === 0);
    const displayYears = [...olderYears, ...recentYears].sort((a, b) => b - a);

    const defaultYears = determineDefaultYears(recentYears.length ? recentYears : displayYears);

    displayYears.forEach((year) => {
        const item = yearContainer.append('div').attr('class', 'year-checkbox-item');

        const checkbox = item
            .append('input')
            .attr('type', 'checkbox')
            .attr('id', `year-${year}`)
            .attr('value', year)
            .property('checked', defaultYears.includes(year));

        item.append('label').attr('for', `year-${year}`).text(year);

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

/**
 * Update radar chart based on selected years keeping chronological order
 */
export function updateRadarChart(data) {
    const selectedYears = [];
    d3.selectAll('#year-checkboxes input:checked').each(function () {
        selectedYears.push(+d3.select(this).attr('value'));
    });

    if (selectedYears.length === 0) {
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
        const levelRadius = radius * (level / GRID_LEVELS);
        grid
            .append('circle')
            .attr('r', levelRadius)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(148, 163, 184, 0.35)')
            .attr('stroke-dasharray', '2 4');

        const value = minValue + ((maxValue - minValue) * level) / GRID_LEVELS;
        grid
            .append('text')
            .attr('y', -levelRadius)
            .attr('x', 6)
            .attr('class', 'radar-grid-label')
            .text(`${value.toFixed(1)}%`);
    });
}

function drawAxes(root, categories, angleSlice, radius) {
    const axisGroup = root.append('g').attr('class', 'radar-axes');

    categories.forEach((category, idx) => {
        const angle = angleSlice * idx - Math.PI / 2;
        const lineCoord = {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
        };

        axisGroup
            .append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', lineCoord.x)
            .attr('y2', lineCoord.y)
            .attr('stroke', 'rgba(148, 163, 184, 0.45)')
            .attr('stroke-width', 1);

        const labelCoord = {
            x: (radius + 24) * Math.cos(angle),
            y: (radius + 24) * Math.sin(angle),
        };

        const text = axisGroup
            .append('text')
            .attr('x', labelCoord.x)
            .attr('y', labelCoord.y)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('class', 'radar-axis-label')
            .text(category.name);

        text.call(wrapText, 110);
    });
}

function resolveLabelPositions(labels, radius) {
    if (!labels.length) {
        return labels;
    }

    const minGap = 16;
    const clamp = radius + 40;
    const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 540 : false;

    const sorted = labels
        .map((label) => ({ ...label }))
        .sort((a, b) => a.y - b.y);

    for (let i = 1; i < sorted.length; i += 1) {
        if (sorted[i].y - sorted[i - 1].y < minGap) {
            sorted[i].y = sorted[i - 1].y + minGap;
        }
    }

    for (let i = sorted.length - 2; i >= 0; i -= 1) {
        if (sorted[i + 1].y - sorted[i].y < minGap) {
            sorted[i].y = sorted[i + 1].y - minGap;
        }
    }

    sorted.forEach((label) => {
        label.y = Math.max(-clamp, Math.min(clamp, label.y));
        label.x = Math.max(-clamp, Math.min(clamp, label.x));
    });

    if (isSmallScreen && sorted.length > 1) {
        const highestPriority = d3.max(sorted, (d) => d.priority) ?? 1;
        let shown = 0;
        sorted.forEach((label) => {
            if (label.priority === highestPriority && shown === 0) {
                label.hidden = false;
                shown += 1;
            } else {
                label.hidden = true;
            }
        });
    }

    return sorted;
}

function determineDefaultYears(years) {
    if (!years.length) {
        return [];
    }
    const sorted = [...years].sort((a, b) => a - b);
    const take = Math.min(MAX_DEFAULT_VISIBLE_YEARS, sorted.length);
    return sorted.slice(-take);
}
