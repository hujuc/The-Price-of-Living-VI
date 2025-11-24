/**
 * Country Comparison Module
 * Allows selecting two countries and comparing key indicators
 */

import { getAvailableCountries, loadCountryComparisonSnapshot, calculateRealWage } from './data-loader.js';
import { renderEmptyState } from './empty-state.js';

const BASE_COUNTRY = "Portugal";
const DEFAULT_SECONDARY_COUNTRY = "Espanha";
const currencyFormatter = new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
});
const INFLATION_THRESHOLD = 5; // %
const WAGE_INDEX_THRESHOLD = 100; // base 2020

const state = {
    countries: [],
    selected: { a: BASE_COUNTRY, b: null },
    data: { a: null, b: null },
    normalized: null
};

let comparisonModuleReady = false;
let pendingComparisonSelection = null;

export async function initCountryComparison() {
    const container = d3.select('#country-comparison');
    if (container.empty()) {
        return;
    }

    renderLayout(container);

    try {
        const countries = await getAvailableCountries();
        if (!countries?.length) {
            container.html(renderEmptyState({
                title: 'Sem dados disponíveis',
                message: 'Não foi possível carregar a lista de países para comparação.',
                meta: 'Verifique se o ficheiro de inflação europeia está acessível.',
                icon: '🌍'
            }));
            return;
        }

        if (!countries.includes(BASE_COUNTRY)) {
            countries.unshift(BASE_COUNTRY);
        }

        state.countries = countries;
        const secondary = determineInitialComparisonCountry();
        state.selected = { a: BASE_COUNTRY, b: secondary };
        updateComparisonSelectedLabel(secondary);

        await Promise.all([
            refreshSide('a', BASE_COUNTRY),
            refreshSide('b', secondary)
        ]);

        comparisonModuleReady = true;
        if (pendingComparisonSelection != null) {
            await applyComparisonSelection(pendingComparisonSelection);
        }
    } catch (error) {
        console.error('Country comparison failed:', error);
        container.html(renderEmptyState({
            title: 'Erro ao preparar a comparação',
            message: 'Ocorreu um problema ao carregar os dados necessários.',
            meta: `Detalhes técnicos: ${error.message}`,
            icon: '⚠️'
        }));
    }
}

export async function syncComparisonCountry(country) {
    pendingComparisonSelection = country || null;
    if (!comparisonModuleReady) {
        return;
    }
    await applyComparisonSelection(pendingComparisonSelection);
}

function renderLayout(container) {
    container.html(`
        <div class="comparison-controls">
            <div class="comparison-control base-country-control">
                <span class="control-label">País de referência</span>
                <div class="base-country-pill">
                    <div class="pill-name">${BASE_COUNTRY}</div>
                    <div class="pill-meta">Fixo para garantir comparação consistente</div>
                </div>
            </div>
            <div class="comparison-control">
                <span class="control-label">Comparar com</span>
                <div class="base-country-pill comparison-country-pill">
                    <div class="pill-name" id="comparison-selected-country">Aguardando seleção…</div>
                    <div class="pill-meta" id="comparison-selected-meta">Sincronizado com o país escolhido no mapa interativo.</div>
                </div>
                <p class="comparison-hint">Use o mapa de seleção no topo da página para alterar o país de comparação.</p>
            </div>
        </div>

        <div class="comparison-panels">
            <div class="comparison-card" data-side="a">
                ${renderCardSkeleton()}
            </div>

            <div class="comparison-diff" id="comparison-diff">
                <div class="diff-title">Diferenças rápidas</div>
                <div class="diff-grid">
                    <div class="diff-card" data-metric="inflation">
                        <div class="diff-label">Inflação total</div>
                        <div class="diff-value" id="diff-inflation-value">Selecione dois países</div>
                        <div class="diff-meta" id="diff-inflation-meta"></div>
                    </div>
                    <div class="diff-card" data-metric="wage">
                        <div class="diff-label">Salário real ajustado (€)</div>
                        <div class="diff-value" id="diff-wage-value">Selecione dois países</div>
                        <div class="diff-meta" id="diff-wage-meta"></div>
                    </div>
                </div>
                <p class="diff-base-note" id="diff-base-note">A aguardar seleção para alinhar uma base comum.</p>
            </div>

            <div class="comparison-card" data-side="b">
                ${renderCardSkeleton()}
            </div>
        </div>

        <div class="comparison-chart-wrapper">
            <div class="comparison-chart-header">
                <h4>Matriz de quadrantes: inflação vs. salário real</h4>
                <p>Cada ponto representa um país no plano (Inflação %, Índice real do salário mínimo).</p>
            </div>
            <div id="comparison-chart" class="comparison-chart">
                <div class="comparison-chart-empty">Selecione um país para ver o gráfico comparativo.</div>
            </div>
            <p class="comparison-chart-note" id="comparison-chart-note">O eixo Y utiliza, por omissão, a base própria de cada país.</p>
        </div>

        <div class="real-wage-chart-wrapper">
            <div class="comparison-chart-header">
                <h4>Salário real ajustado: comparação direta</h4>
                <p>Gráfico do tipo dumbbell que mostra o salário real (em euros) de Portugal e do país selecionado, alinhado ao mesmo ano base quando disponível.</p>
            </div>
            <div id="real-wage-dumbbell" class="real-wage-dumbbell">
                <div class="comparison-chart-empty">Selecione um país para comparar salários reais.</div>
            </div>
        </div>
    `);
}

function renderCardSkeleton() {
    return `
        <div class="comparison-card-inner">
            <div class="comparison-loading">
                <div class="spinner"></div>
                <span>A atualizar…</span>
            </div>
            <div class="comparison-body">
                <div class="comparison-country-name" data-field="country-name">—</div>
                <div class="comparison-updated" data-field="updated-meta"></div>

                <div class="comparison-metric" data-metric="inflation">
                    <div class="metric-label">Inflação total</div>
                    <div class="metric-value" data-field="inflation-value">—</div>
                    <div class="metric-meta" data-field="inflation-meta">Sem dados disponíveis.</div>
                </div>

                <div class="comparison-metric" data-metric="wage">
                    <div class="metric-label">Salário mínimo nominal</div>
                    <div class="metric-value" data-field="wage-nominal">—</div>
                    <div class="metric-meta" data-field="wage-meta">Sem dados disponíveis.</div>
                </div>

                <div class="comparison-real" data-field="real-block">
                    <div class="real-label">Salário real ajustado</div>
                    <div class="real-value" data-field="wage-real">—</div>
                    <div class="real-meta" data-field="wage-real-meta">—</div>
                </div>

                <div class="comparison-index" data-field="index-block">
                    <div class="index-label" data-field="wage-index-label">Índice real (base = 100)</div>
                    <div class="index-value" data-field="wage-index">—</div>
                </div>
            </div>
        </div>
    `;
}

function determineInitialComparisonCountry() {
    const globalSelection = typeof window !== 'undefined' ? window.currentCountry : null;
    if (globalSelection && globalSelection !== BASE_COUNTRY) {
        return normalizeToKnownCountry(globalSelection);
    }

    if (state.countries.includes(DEFAULT_SECONDARY_COUNTRY) && DEFAULT_SECONDARY_COUNTRY !== BASE_COUNTRY) {
        return DEFAULT_SECONDARY_COUNTRY;
    }

    const fallback = state.countries.find(country => country !== BASE_COUNTRY);
    return fallback || null;
}

function normalizeToKnownCountry(countryName, list = state.countries) {
    if (!countryName || !countryName.trim()) {
        return null;
    }
    const trimmed = countryName.trim();
    const match = list?.find(entry => entry.toLowerCase() === trimmed.toLowerCase());
    return match || trimmed;
}

function updateComparisonSelectedLabel(country) {
    const label = d3.select('#comparison-selected-country');
    const meta = d3.select('#comparison-selected-meta');

    if (!label.empty()) {
        label.text(country || 'Selecione um país no mapa');
    }

    if (!meta.empty()) {
        if (!country) {
            meta.text('Ainda não existe um país de comparação selecionado.');
        } else if (country === BASE_COUNTRY) {
            meta.text('A comparação está alinhada com o país de referência.');
        } else {
            meta.text('Sincronizado automaticamente com o mapa interativo.');
        }
    }
}

async function applyComparisonSelection(country) {
    const normalized = normalizeToKnownCountry(country);
    pendingComparisonSelection = null;

    if (state.selected.b === normalized) {
        updateComparisonSelectedLabel(normalized);
        return;
    }

    state.selected.b = normalized;
    updateComparisonSelectedLabel(normalized);
    await refreshSide('b', normalized);
}

async function refreshSide(side, country) {
    const card = d3.select(`.comparison-card[data-side="${side}"]`);
    setCardLoading(card, true);

    if (!country) {
        renderCardEmpty(card, 'Selecione um país');
        state.data[side] = null;
        setCardLoading(card, false);
        updateDiffSummary();
        return;
    }

    const snapshot = await loadCountryComparisonSnapshot(country);
    state.data[side] = snapshot;

    if (!snapshot) {
        renderCardEmpty(card, 'Sem dados disponíveis');
    } else {
        renderCard(card, snapshot);
    }

    setCardLoading(card, false);
    recomputeAlignment();
    updateDiffSummary();
    renderComparisonChart();
    renderRealWageDumbbell();
}

function setCardLoading(card, isLoading) {
    card.classed('is-loading', isLoading);
    card.select('.comparison-loading').style('display', isLoading ? 'flex' : 'none');
    card.select('.comparison-body').style('opacity', isLoading ? 0.35 : 1);
}

function renderCardEmpty(card, message) {
    card.select('[data-field="country-name"]').text(message);
    card.select('[data-field="updated-meta"]').text('');
    card.select('[data-field="inflation-value"]').text('—');
    card.select('[data-field="inflation-meta"]').text('Sem dados disponíveis.');
    card.select('[data-field="wage-nominal"]').text('—');
    card.select('[data-field="wage-meta"]').text('Sem dados disponíveis.');
    card.select('[data-field="wage-real"]').text('—');
    card.select('[data-field="wage-real-meta"]').text('Sem dados disponíveis.');
    card.select('[data-field="wage-index-label"]').text('Índice real (base = 100)');
    card.select('[data-field="wage-index"]').text('—');
}

function renderCard(card, snapshot) {
    card.select('[data-field="country-name"]').text(snapshot.displayName || snapshot.country);

    const metaParts = [];
    if (snapshot.inflation?.year) {
        metaParts.push(`Inflação: ${snapshot.inflation.year}`);
    }
    if (snapshot.wage?.year) {
        metaParts.push(`Salário: ${snapshot.wage.year}`);
    }
    card.select('[data-field="updated-meta"]').text(metaParts.join(' • '));

    if (snapshot.inflation?.value != null) {
        card.select('[data-field="inflation-value"]').text(formatPercent(snapshot.inflation.value));
        card.select('[data-field="inflation-meta"]').text(`Total em ${snapshot.inflation.year}`);
    } else {
        card.select('[data-field="inflation-value"]').text('—');
        card.select('[data-field="inflation-meta"]').text('Sem dados suficientes para inflação total.');
    }

    if (snapshot.wage?.nominal != null) {
        card.select('[data-field="wage-nominal"]').text(formatCurrency(snapshot.wage.nominal));
        const nominalMeta = snapshot.wage.year
            ? `Valor nominal em ${snapshot.wage.year}`
            : 'Valor nominal mais recente disponível';
        card.select('[data-field="wage-meta"]').text(nominalMeta);

        const realValue = snapshot.wage.real != null ? snapshot.wage.real : null;
        card.select('[data-field="wage-real"]').text(realValue != null ? formatCurrency(realValue) : '—');
        const realMeta = snapshot.wage.baseYear
            ? `Base ${snapshot.wage.baseYear} = 100 (ajustado pela inflação)`
            : 'Base não disponível';
        card.select('[data-field="wage-real-meta"]').text(realMeta);

        const indexLabelText = snapshot.wage.baseYear
            ? `Índice real (base ${snapshot.wage.baseYear} = 100)`
            : 'Índice real (base = 100)';
        card.select('[data-field="wage-index-label"]').text(indexLabelText);
        card.select('[data-field="wage-index"]').text(formatIndex(snapshot.wage.index));
    } else {
        card.select('[data-field="wage-nominal"]').text('—');
        card.select('[data-field="wage-meta"]').text('Sem valores de salário mínimo.');
        card.select('[data-field="wage-real"]').text('—');
        card.select('[data-field="wage-real-meta"]').text('Sem dados de salário real.');
        card.select('[data-field="wage-index-label"]').text('Índice real (base = 100)');
        card.select('[data-field="wage-index"]').text('—');
    }
}

function updateDiffSummary() {
    const diffInflationValue = d3.select('#diff-inflation-value');
    const diffInflationMeta = d3.select('#diff-inflation-meta');
    const diffWageValue = d3.select('#diff-wage-value');
    const diffWageMeta = d3.select('#diff-wage-meta');
    const diffWageLabel = d3.select('[data-metric="wage"] .diff-label');
    const diffBaseNote = d3.select('#diff-base-note');

    const normalizedBaseYear = state.normalized?.baseYear;
    if (!diffWageLabel.empty()) {
        diffWageLabel.text('Salário real ajustado (€)');
    }

    if (!diffBaseNote.empty()) {
        diffBaseNote.text(normalizedBaseYear
            ? `A comparação de salário real foi alinhada ao ano ${normalizedBaseYear}, garantindo o mesmo ponto de partida.`
            : 'Sem um ano em comum, cada país mantém o seu ponto de partida original.');
    }

    describeDifference({
        metricLabel: 'inflação',
        unit: 'p.p.',
        formatter: formatPercent,
        valueA: state.data.a?.inflation?.value,
        valueB: state.data.b?.inflation?.value,
        valueTarget: diffInflationValue,
        metaTarget: diffInflationMeta
    });

    const realBaseNote = normalizedBaseYear
        ? `Base comum ${normalizedBaseYear} = 100`
        : buildBaseNoteForRealWage();

    describeDifference({
        metricLabel: 'o salário real ajustado',
        unit: '',
        formatter: formatCurrency,
        valueA: getRealWageValue('a'),
        valueB: getRealWageValue('b'),
        valueTarget: diffWageValue,
        metaTarget: diffWageMeta,
        metaExtra: realBaseNote,
        differenceFormatter: formatCurrency
    });
}

function describeDifference({ metricLabel, unit, formatter, valueA, valueB, valueTarget, metaTarget, metaExtra = null, differenceFormatter = null }) {
    const nameA = state.data.a?.displayName || 'País A';
    const nameB = state.data.b?.displayName || 'País B';

    if (valueA == null || valueB == null) {
        valueTarget.text('Sem dados comparáveis');
        const fallbackText = 'Escolha países com dados disponíveis para ambos os indicadores.';
        if (metaExtra) {
            metaTarget.html(`${fallbackText}<br/><small>${metaExtra}</small>`);
        } else {
            metaTarget.text(fallbackText);
        }
        valueTarget.attr('data-leader', 'none');
        return;
    }

    const diff = valueA - valueB;
    if (Math.abs(diff) < 0.05) {
        valueTarget.text('Valores muito próximos');
        const metaText = `${nameA}: ${formatter(valueA)} • ${nameB}: ${formatter(valueB)}`;
        if (metaExtra) {
            metaTarget.html(`${metaText}<br/><small>${metaExtra}</small>`);
        } else {
            metaTarget.text(metaText);
        }
        valueTarget.attr('data-leader', 'tie');
        return;
    }

    const leaderName = diff > 0 ? nameA : nameB;
    const trailingName = diff > 0 ? nameB : nameA;
    const leaderValue = diff > 0 ? valueA : valueB;
    const trailingValue = diff > 0 ? valueB : valueA;
    const qualifier = diff > 0 ? 'mais' : 'menos';
    const diffText = differenceFormatter
        ? differenceFormatter(Math.abs(diff))
        : formatDifference(Math.abs(diff), unit);

    valueTarget.text(`${leaderName} tem ${diffText} ${qualifier} ${metricLabel} que ${trailingName}`);
    valueTarget.attr('data-leader', diff > 0 ? 'a' : 'b');
    const metaText = `${leaderName}: ${formatter(leaderValue)} • ${trailingName}: ${formatter(trailingValue)}`;
    if (metaExtra) {
        metaTarget.html(`${metaText}<br/><small>${metaExtra}</small>`);
    } else {
        metaTarget.text(metaText);
    }
}

function renderComparisonChart() {
    const chartContainer = d3.select('#comparison-chart');
    if (chartContainer.empty()) {
        return;
    }

    chartContainer.selectAll('*').remove();
    const chartNote = d3.select('#comparison-chart-note');
    if (!chartNote.empty()) {
        chartNote.text('O eixo Y utiliza, por omissão, a base própria de cada país.');
    }

    if (!state.data.a || !state.data.b) {
        chartContainer.append('div')
            .attr('class', 'comparison-chart-empty')
            .text('Selecione um país para iniciar a visualização.');
        return;
    }

    if (!chartNote.empty()) {
        if (state.normalized?.baseYear) {
            chartNote.text(`Índices ajustados a uma base comum (${state.normalized.baseYear} = 100) para garantir comparabilidade.`);
        } else {
            chartNote.text('Não existe ano em comum para alinhar a base; cada país usa o seu próprio ponto de partida.');
        }
    }

    const dataPoints = [
        {
            key: 'base',
            label: getCountryLabel('a'),
            inflation: safeNumber(state.data.a?.inflation?.value),
            wageIndex: safeNumber(state.normalized?.a?.wageIndex ?? state.data.a?.wage?.index)
        },
        {
            key: 'compare',
            label: getCountryLabel('b'),
            inflation: safeNumber(state.data.b?.inflation?.value),
            wageIndex: safeNumber(state.normalized?.b?.wageIndex ?? state.data.b?.wage?.index)
        }
    ];

    if (dataPoints.some(pt => pt.inflation == null || pt.wageIndex == null)) {
        chartContainer.append('div')
            .attr('class', 'comparison-chart-empty')
            .text('Ainda não existem dados em comum para construir o gráfico.');
        if (!chartNote.empty()) {
            chartNote.text('Ainda não existem dados em comum para alinhar o eixo Y.');
        }
        return;
    }

    const width = chartContainer.node().clientWidth || 640;
    const height = 360;
    const margin = { top: 24, right: 20, bottom: 50, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xMax = Math.max(INFLATION_THRESHOLD * 1.4, d3.max(dataPoints, d => d.inflation) * 1.15);
    const yMin = Math.min(WAGE_INDEX_THRESHOLD * 0.7, d3.min(dataPoints, d => d.wageIndex) * 0.9);
    const yMax = Math.max(WAGE_INDEX_THRESHOLD * 1.3, d3.max(dataPoints, d => d.wageIndex) * 1.1);

    const xScale = d3.scaleLinear()
        .domain([0, xMax])
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([yMin, yMax])
        .nice()
        .range([innerHeight, 0]);

    const svg = chartContainer.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('role', 'img');

    const root = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    root.append('rect')
        .attr('class', 'comparison-scatter-bg')
        .attr('width', innerWidth)
        .attr('height', innerHeight);

    const areas = [
        { key: 'lowInflation_highWage', x: [0, INFLATION_THRESHOLD], y: [WAGE_INDEX_THRESHOLD, yMax], label: 'Melhor cenário' },
        { key: 'highInflation_highWage', x: [INFLATION_THRESHOLD, xMax], y: [WAGE_INDEX_THRESHOLD, yMax], label: 'Inflação elevada, salário resiliente' },
        { key: 'lowInflation_lowWage', x: [0, INFLATION_THRESHOLD], y: [yMin, WAGE_INDEX_THRESHOLD], label: 'Salário fraco apesar da inflação contida' },
        { key: 'highInflation_lowWage', x: [INFLATION_THRESHOLD, xMax], y: [yMin, WAGE_INDEX_THRESHOLD], label: 'Pior cenário' }
    ];

    const quadrantColors = {
        lowInflation_highWage: 'rgba(34,197,94,0.08)',
        highInflation_highWage: 'rgba(45,212,191,0.08)',
        lowInflation_lowWage: 'rgba(250,204,21,0.08)',
        highInflation_lowWage: 'rgba(248,113,113,0.12)'
    };

    root.append('g')
        .attr('class', 'quadrant-areas')
        .selectAll('rect')
        .data(areas)
        .join('rect')
        .attr('x', area => xScale(area.x[0]))
        .attr('y', area => yScale(area.y[1]))
        .attr('width', area => xScale(area.x[1]) - xScale(area.x[0]))
        .attr('height', area => yScale(area.y[0]) - yScale(area.y[1]))
        .attr('fill', area => quadrantColors[area.key] || 'transparent');

    root.append('g')
        .attr('class', 'comparison-chart-grid')
        .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(''))
        .selectAll('line')
        .attr('stroke', 'rgba(15, 23, 42, 0.1)');

    root.append('g')
        .attr('class', 'comparison-chart-y-axis')
        .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => `${Math.round(d)}`.replace('.', ',')));

    root.append('g')
        .attr('class', 'comparison-chart-x-axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `${d.toFixed(1).replace('.', ',')}`));

    root.append('line')
        .attr('class', 'threshold-line')
        .attr('x1', xScale(INFLATION_THRESHOLD))
        .attr('x2', xScale(INFLATION_THRESHOLD))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', 'rgba(15, 23, 42, 0.25)')
        .attr('stroke-dasharray', '8 6');

    root.append('line')
        .attr('class', 'threshold-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(WAGE_INDEX_THRESHOLD))
        .attr('y2', yScale(WAGE_INDEX_THRESHOLD))
        .attr('stroke', 'rgba(15, 23, 42, 0.25)')
        .attr('stroke-dasharray', '8 6');

    root.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'middle')
        .text('Inflação total (%)');

    const yAxisLabel = state.normalized?.baseYear
        ? `Índice real do salário mínimo (base comum ${state.normalized.baseYear} = 100)`
        : 'Índice real do salário mínimo (base própria = 100)';

    root.append('text')
        .attr('class', 'axis-label')
        .attr('transform', `translate(${-50}, ${innerHeight / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .text(yAxisLabel);

    root.append('g')
        .attr('class', 'quadrant-labels')
        .selectAll('text')
        .data(areas)
        .join('text')
        .attr('x', area => (xScale(area.x[0]) + xScale(area.x[1])) / 2)
        .attr('y', area => (yScale(area.y[0]) + yScale(area.y[1])) / 2)
        .attr('class', 'quadrant-label')
        .attr('text-anchor', 'middle')
        .text(area => area.label);

    const colorScale = d3.scaleOrdinal()
        .domain(['base', 'compare'])
        .range(['#16a34a', '#2563eb']);

    const pointGroup = root.append('g')
        .attr('class', 'comparison-points');

    pointGroup.selectAll('circle')
        .data(dataPoints)
        .join('circle')
        .attr('class', 'comparison-point')
        .attr('cx', d => xScale(d.inflation))
        .attr('cy', d => yScale(d.wageIndex))
        .attr('r', 9)
        .attr('fill', d => colorScale(d.key))
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .append('title')
        .text(d => `${d.label}: ${formatPercent(d.inflation)} | ${formatIndex(d.wageIndex)}`);

    const labelSettings = computeLabelSettings(dataPoints, xScale, yScale);

    pointGroup.selectAll('text')
        .data(dataPoints)
        .join('text')
        .attr('class', 'comparison-point-label')
        .attr('x', d => xScale(d.inflation) + (labelSettings[d.key]?.dx ?? 0))
        .attr('y', d => yScale(d.wageIndex) + (labelSettings[d.key]?.dy ?? -12))
        .attr('text-anchor', d => labelSettings[d.key]?.anchor || 'start')
        .text(d => d.label);

    const legend = root.append('g')
        .attr('class', 'comparison-chart-legend')
        .attr('transform', `translate(0, ${-margin.top / 2})`);

    const legendItem = legend.selectAll('g')
        .data(dataPoints)
        .join('g')
        .attr('transform', (_, index) => `translate(${index * 160}, 0)`);

    legendItem.append('circle')
        .attr('r', 6)
        .attr('cx', 6)
        .attr('cy', 6)
        .attr('fill', d => colorScale(d.key));

    legendItem.append('text')
        .attr('x', 20)
        .attr('y', 10)
        .text(d => d.label)
        .attr('class', 'comparison-legend-label');
}

function renderRealWageDumbbell() {
    const container = d3.select('#real-wage-dumbbell');
    if (container.empty()) {
        return;
    }

    container.selectAll('*').remove();

    if (!state.data.a || !state.data.b) {
        container.append('div')
            .attr('class', 'comparison-chart-empty')
            .text('Selecione um país para comparar os salários reais.');
        return;
    }

    const dataPoints = [
        {
            key: 'base',
            label: getCountryLabel('a'),
            value: getRealWageValue('a')
        },
        {
            key: 'compare',
            label: getCountryLabel('b'),
            value: getRealWageValue('b')
        }
    ];

    if (dataPoints.some(point => point.value == null)) {
        container.append('div')
            .attr('class', 'comparison-chart-empty')
            .text('Ainda não existem salários reais suficientes para construir o gráfico.');
        return;
    }

    const width = container.node().clientWidth || 640;
    const height = 220;
    const margin = { top: 30, right: 40, bottom: 45, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const centerY = innerHeight / 2;

    const minValue = d3.min(dataPoints, d => d.value);
    const maxValue = d3.max(dataPoints, d => d.value);
    const padding = Math.max((maxValue - minValue) * 0.15, maxValue * 0.08);
    const domainMin = Math.max(0, minValue - padding);
    const domainMax = maxValue + padding;

    const xScale = d3.scaleLinear()
        .domain([domainMin, domainMax])
        .nice()
        .range([0, innerWidth]);

    const svg = container.append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('role', 'img');

    const root = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    root.append('g')
        .attr('class', 'dumbbell-axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale)
            .ticks(5)
            .tickFormat(value => currencyFormatter.format(value)));

    root.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 35)
        .attr('text-anchor', 'middle')
        .text('Salário real ajustado (€)');

    root.append('line')
        .attr('class', 'dumbbell-connector')
        .attr('x1', xScale(dataPoints[0].value))
        .attr('x2', xScale(dataPoints[1].value))
        .attr('y1', centerY)
        .attr('y2', centerY);

    const colorScale = d3.scaleOrdinal()
        .domain(['base', 'compare'])
        .range(['#16a34a', '#2563eb']);

    root.selectAll('.dumbbell-node')
        .data(dataPoints)
        .join('circle')
        .attr('class', 'dumbbell-node')
        .attr('cx', d => xScale(d.value))
        .attr('cy', centerY)
        .attr('r', 14)
        .attr('fill', d => colorScale(d.key));

    root.selectAll('.dumbbell-value-label')
        .data(dataPoints)
        .join('text')
        .attr('class', 'dumbbell-value-label')
        .attr('x', d => xScale(d.value))
        .attr('y', centerY - 20)
        .attr('text-anchor', 'middle')
        .text(d => `${d.label}: ${formatCurrency(d.value)}`);

    const diff = Math.abs(dataPoints[0].value - dataPoints[1].value);
    root.append('text')
        .attr('class', 'dumbbell-diff-label')
        .attr('x', (xScale(dataPoints[0].value) + xScale(dataPoints[1].value)) / 2)
        .attr('y', centerY + 30)
        .attr('text-anchor', 'middle')
        .text(`Diferença: ${formatCurrency(diff)}`);

    const baseYearNote = state.normalized?.baseYear
        ? `Base comum utilizada: ${state.normalized.baseYear}`
        : buildBaseNoteForRealWage() || 'Cada país está ajustado à sua própria base.';

    root.append('text')
        .attr('class', 'dumbbell-base-note')
        .attr('x', innerWidth / 2)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .text(baseYearNote);
}

function recomputeAlignment() {
    const snapshotA = state.data.a;
    const snapshotB = state.data.b;

    if (!snapshotA?.wage || !snapshotB?.wage) {
        state.normalized = null;
        return;
    }

    const sharedBaseYear = findSharedBaseYear(snapshotA, snapshotB);
    if (!sharedBaseYear) {
        state.normalized = null;
        return;
    }

    const alignedA = computeAlignedMetrics(snapshotA, sharedBaseYear);
    const alignedB = computeAlignedMetrics(snapshotB, sharedBaseYear);

    if (!alignedA || !alignedB) {
        state.normalized = null;
        return;
    }

    state.normalized = {
        baseYear: sharedBaseYear,
        a: alignedA,
        b: alignedB
    };
}

function findSharedBaseYear(snapshotA, snapshotB) {
    const yearsA = new Set(snapshotA?.wageTimeline?.map(entry => entry.year) || []);
    const yearsB = new Set(snapshotB?.wageTimeline?.map(entry => entry.year) || []);

    const sharedYears = Array.from(yearsA).filter(year => yearsB.has(year)).sort((a, b) => a - b);
    if (!sharedYears.length) {
        return null;
    }

    if (sharedYears.includes(2020)) {
        return 2020;
    }

    return sharedYears[0];
}

function computeAlignedMetrics(snapshot, baseYear) {
    if (!snapshot?.wage || !snapshot.wageTimeline?.length || !snapshot.inflationSeries?.length) {
        return null;
    }

    const baseEntry = snapshot.wageTimeline.find(entry => entry.year === baseYear);
    if (!baseEntry || baseEntry.nominal == null) {
        return null;
    }

    const inflationDataset = {
        categories: [{
            name: 'Total',
            values: snapshot.inflationSeries
        }]
    };

    const latestYear = snapshot.wage.year;
    const nominalLatest = snapshot.wage.nominal;
    if (nominalLatest == null || latestYear == null) {
        return null;
    }

    const realLatest = calculateRealWage(nominalLatest, inflationDataset, latestYear, baseYear);
    if (realLatest == null) {
        return null;
    }

    return {
        wageIndex: (realLatest / baseEntry.nominal) * 100,
        alignedReal: realLatest,
        baseNominal: baseEntry.nominal
    };
}

function getCountryLabel(side) {
    const snapshot = state.data[side];
    if (!snapshot) {
        return side === 'a' ? BASE_COUNTRY : 'Outro país';
    }
    return snapshot.displayName || snapshot.country || (side === 'a' ? BASE_COUNTRY : 'Outro país');
}

function safeNumber(value) {
    if (value == null || isNaN(value)) {
        return null;
    }
    return +value;
}

function computeLabelSettings(dataPoints, xScale, yScale) {
    const defaults = {};
    dataPoints.forEach(point => {
        defaults[point.key] = {
            dx: point.key === 'base' ? -12 : 12,
            dy: -12,
            anchor: point.key === 'base' ? 'end' : 'start'
        };
    });

    if (dataPoints.length < 2) {
        return defaults;
    }

    const [first, second] = dataPoints;
    const firstPos = {
        x: xScale(first.inflation),
        y: yScale(first.wageIndex)
    };
    const secondPos = {
        x: xScale(second.inflation),
        y: yScale(second.wageIndex)
    };

    const closeInX = Math.abs(firstPos.x - secondPos.x) < 40;
    const closeInY = Math.abs(firstPos.y - secondPos.y) < 28;

    if (closeInX && closeInY) {
        defaults[first.key] = {
            dx: -18,
            dy: -24,
            anchor: 'end'
        };
        defaults[second.key] = {
            dx: 18,
            dy: 20,
            anchor: 'start'
        };
    }

    return defaults;
}

function getRealWageValue(side) {
    if (state.normalized?.[side]?.alignedReal != null) {
        return state.normalized[side].alignedReal;
    }
    const snapshot = state.data[side];
    return snapshot?.wage?.real ?? null;
}

function buildBaseNoteForRealWage() {
    const baseA = state.data.a?.wage?.baseYear;
    const baseB = state.data.b?.wage?.baseYear;
    if (!baseA && !baseB) {
        return null;
    }
    const nameA = state.data.a?.displayName || 'País A';
    const nameB = state.data.b?.displayName || 'País B';
    return `Bases próprias: ${nameA} (${baseA ?? '—'}) • ${nameB} (${baseB ?? '—'})`;
}

function formatCurrency(value) {
    if (value == null || isNaN(value)) {
        return '—';
    }
    return currencyFormatter.format(value);
}

function formatPercent(value) {
    if (value == null || isNaN(value)) {
        return '—';
    }
    return `${value.toFixed(1).replace('.', ',')}%`;
}

function formatIndex(value) {
    if (value == null || isNaN(value)) {
        return '—';
    }
    return `${Math.round(value)} pts`;
}

function formatDifference(value, unit = '') {
    if (value == null || isNaN(value)) {
        return '—';
    }
    const formatted = value >= 10 ? value.toFixed(0) : value.toFixed(1);
    return `${formatted.replace('.', ',')} ${unit}`.trim();
}
