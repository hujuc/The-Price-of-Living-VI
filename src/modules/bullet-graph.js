/**
 * Bullet Graph Module
 * Compares nominal vs real minimum wage relative to a dynamic base year
 */

import { renderEmptyState } from './empty-state.js';

/**
 * Create bullet graph showing nominal vs real wage
 * @param {Object} yearData - Data for selected year {year, nominal, real, baseYear}
 * @param {number} baseNominal - Nominal wage in the selected base year
 * @param {string} country - Country name for title
 */
export function createBulletGraph(yearData, baseNominal, country = "Portugal", baseYear = 2012) {
    const container = d3.select("#viz-bullet-graph");
    container.html("");

    if (!yearData) {
        container.html(renderEmptyState({
            title: "Selecione um ano",
            message: "Escolha um ponto temporal para comparar o salário nominal e real.",
            meta: "Use a lista de anos disponível acima do gráfico.",
            icon: "🗓️"
        }));
        return;
    }

    const referenceYear = yearData.baseYear ?? baseYear;
    const referenceNominal = baseNominal;

    if (!referenceNominal || !isFinite(referenceNominal) || referenceNominal <= 0) {
        container.html(renderEmptyState({
            title: "Dados de referência em falta",
            message: "Não foi possível identificar o salário base necessário para calibrar o gráfico.",
            meta: "Verifique se o dataset possui valores para o ano de referência.",
            icon: "📏"
        }));
        return;
    }

    // Set dimensions
    const margin = { top: 80, right: 150, bottom: 60, left: 200 };
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    // Create SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Determine scale based on maximum value
    const maxCandidate = Math.max(yearData.nominal || 0, yearData.real || 0, referenceNominal || 0);
    const maxValue = (maxCandidate > 0 ? maxCandidate : 1) * 1.1;

    const xScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, width]);

    // Define ranges for bullet graph
    const ranges = [
        { level: "poor", value: referenceNominal * 0.8, color: "#fee0d2" },
        { level: "fair", value: referenceNominal * 0.9, color: "#fcbba1" },
        { level: "good", value: referenceNominal, color: "#fc9272" },
        { level: "excellent", value: maxValue, color: "#fb6a4a" }
    ];

    // Bar height
    const barHeight = 60;
    const yCenter = height / 2;

    // Draw background ranges
    ranges.forEach((range, i) => {
        const prevValue = i === 0 ? 0 : ranges[i - 1].value;

        svg.append("rect")
            .attr("x", xScale(prevValue))
            .attr("y", yCenter - barHeight / 2)
            .attr("width", xScale(range.value) - xScale(prevValue))
            .attr("height", barHeight)
            .attr("fill", range.color)
            .attr("opacity", 0.6);
    });

    // Draw nominal wage bar (darker)
    svg.append("rect")
        .attr("x", 0)
        .attr("y", yCenter - barHeight / 3)
        .attr("width", xScale(yearData.nominal))
        .attr("height", barHeight * 2/3)
        .attr("fill", "#2c3e50")
        .attr("opacity", 0.8);

    // Draw real wage marker (vertical line)
    svg.append("line")
        .attr("x1", xScale(yearData.real))
        .attr("x2", xScale(yearData.real))
        .attr("y1", yCenter - barHeight / 2 - 10)
        .attr("y2", yCenter + barHeight / 2 + 10)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 4);

    // Add marker triangle at top
    svg.append("path")
        .attr("d", `M ${xScale(yearData.real) - 8},${yCenter - barHeight / 2 - 10}
                    L ${xScale(yearData.real) + 8},${yCenter - barHeight / 2 - 10}
                    L ${xScale(yearData.real)},${yCenter - barHeight / 2 - 18} Z`)
        .attr("fill", "#e74c3c");

    // Draw base year reference line
    svg.append("line")
        .attr("x1", xScale(referenceNominal))
        .attr("x2", xScale(referenceNominal))
        .attr("y1", yCenter - barHeight / 2 - 5)
        .attr("y2", yCenter + barHeight / 2 + 5)
        .attr("stroke", "#3498db")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");

    // Add X axis
    const xAxis = d3.axisBottom(xScale)
        .ticks(8)
        .tickFormat(d => d.toFixed(0) + "€");

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${yCenter + barHeight / 2 + 15})`)
        .call(xAxis);

    // Add labels
    svg.append("text")
        .attr("x", -10)
        .attr("y", yCenter)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .text(yearData.year);

    // Value labels
    svg.append("text")
        .attr("x", xScale(yearData.nominal) + 10)
        .attr("y", yCenter)
        .attr("text-anchor", "start")
        .attr("font-size", "12px")
        .attr("fill", "#2c3e50")
        .attr("font-weight", "600")
        .text(`${yearData.nominal.toFixed(1)}€ (nominal)`);

    svg.append("text")
        .attr("x", xScale(yearData.real))
        .attr("y", yCenter - barHeight / 2 - 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#e74c3c")
        .attr("font-weight", "600")
        .text(`${yearData.real.toFixed(1)}€ (real)`);

    svg.append("text")
        .attr("x", xScale(referenceNominal))
        .attr("y", yCenter - barHeight / 2 - 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#3498db")
        .attr("font-weight", "600")
        .text(`Ref ${referenceYear}: ${referenceNominal.toFixed(1)}€`);

    // Country name mapping for display
    const countryNames = {
        "Portugal": "Portugal",
        "Espanha": "Espanha",
        "France": "França",
        "Alemanha": "Alemanha"
    };
    const displayCountry = countryNames[country] || country;

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#2c3e50")
        .text(`Salário Mínimo: Nominal vs Real (${displayCountry})`);

    // Add subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#7f8c8d")
        .text(`Poder de compra do salário em ${yearData.year} comparado com ${referenceYear}`);

    // Add calculation explanation
    const explanationGroup = svg.append("g")
        .attr("transform", `translate(${-margin.left + 10}, ${-60})`);

    explanationGroup.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("font-size", "11px")
        .attr("fill", "#34495e")
        .attr("font-weight", "600")
        .text("Cálculo:");

    explanationGroup.append("text")
        .attr("x", 0)
        .attr("y", 15)
        .attr("font-size", "10px")
        .attr("fill", "#7f8c8d")
        .text(`Ano de referência: ${referenceYear}`);

    explanationGroup.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .attr("font-size", "10px")
        .attr("fill", "#7f8c8d")
        .text("Salário Real = Salário Nominal / Inflação Acumulada");

    explanationGroup.append("text")
        .attr("x", 0)
        .attr("y", 43)
        .attr("font-size", "9px")
        .attr("fill", "#95a5a6")
        .text("Dados: RMMG (salário) + IPC Total (inflação)");

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, ${-40})`);

    const legendItems = [
        { label: "Salário Nominal", color: "#2c3e50", type: "rect" },
        { label: "Salário Real", color: "#e74c3c", type: "line" },
        { label: `Referência ${referenceYear}`, color: "#3498db", type: "dash" }
    ];

    legendItems.forEach((item, i) => {
        const yPos = i * 25;

        if (item.type === "rect") {
            legend.append("rect")
                .attr("x", 0)
                .attr("y", yPos - 8)
                .attr("width", 20)
                .attr("height", 12)
                .attr("fill", item.color)
                .attr("opacity", 0.8);
        } else if (item.type === "line") {
            legend.append("line")
                .attr("x1", 0)
                .attr("x2", 20)
                .attr("y1", yPos)
                .attr("y2", yPos)
                .attr("stroke", item.color)
                .attr("stroke-width", 4);
        } else if (item.type === "dash") {
            legend.append("line")
                .attr("x1", 0)
                .attr("x2", 20)
                .attr("y1", yPos)
                .attr("y2", yPos)
                .attr("stroke", item.color)
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5");
        }

        legend.append("text")
            .attr("x", 25)
            .attr("y", yPos + 4)
            .attr("font-size", "11px")
            .text(item.label);
    });

    // Calculate and display difference
    const difference = yearData.real - referenceNominal;
    const percentChange = referenceNominal ? ((yearData.real - referenceNominal) / referenceNominal * 100).toFixed(1) : null;

    const diffText = svg.append("text")
        .attr("x", width / 2)
        .attr("y", yCenter + barHeight / 2 + 60)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "600");

    if (percentChange === null) {
        diffText.attr("fill", "#7f8c8d")
            .text("Sem referência para comparar o poder de compra.");
    } else if (difference > 0) {
        diffText.attr("fill", "#27ae60")
            .text(`+${difference.toFixed(1)}€ (+${percentChange}%) em poder de compra vs ${referenceYear}`);
    } else if (difference < 0) {
        diffText.attr("fill", "#e74c3c")
            .text(`${difference.toFixed(1)}€ (${percentChange}%) em poder de compra vs ${referenceYear}`);
    } else {
        diffText.attr("fill", "#7f8c8d")
            .text(`Mesmo poder de compra que ${referenceYear}`);
    }

    console.log("Bullet graph created successfully for year", yearData.year);
}

/**
 * Setup year selector for bullet graph
 */
export function setupBulletYearSelector(bulletGraphData, country = "Portugal") {
    const container = d3.select("#bullet-year-selector");
    container.html("");

    if (!bulletGraphData || !bulletGraphData.years) {
        console.error("No data available for year selector");
        d3.select("#viz-bullet-graph")
            .html(renderEmptyState({
                title: "Dados indisponíveis",
                message: "Não foi possível carregar as séries anuais do salário mínimo.",
                meta: "Garanta que o ficheiro de dados contém anos válidos para o país.",
                icon: "🚧"
            }));
        return;
    }

    const { data, years, baseYear, baseNominal } = bulletGraphData;

    if (!baseYear || !baseNominal) {
        console.warn("Bullet graph base information missing", bulletGraphData);
    }

    if (!years.length) {
        resetBulletYearSelector("Sem anos disponíveis");
        d3.select("#viz-bullet-graph")
            .html(renderEmptyState({
                title: "Sem dados disponíveis",
                message: "Não há valores anuais suficientes para construir o gráfico comparativo.",
                meta: "Confirme se os ficheiros de dados incluem o país selecionado.",
                icon: "📉"
            }));
        return;
    }

    // Create dropdown
    const select = container.append("select")
        .attr("id", "year-select")
        .attr("class", "year-select-dropdown");

    // Add option for each year
    years.forEach(year => {
        select.append("option")
            .attr("value", year)
            .property("selected", false)
            .text(year);
    });

    // Initial render
    const initialYear = years[years.length - 1];
    if (initialYear) {
        select.property("value", initialYear);
        createBulletGraph(data[initialYear], baseNominal, country, baseYear);
    } else {
        resetBulletYearSelector("Sem anos disponíveis");
        d3.select("#viz-bullet-graph")
            .html(renderEmptyState({
                title: "Sem dados disponíveis",
                message: "Não há valores anuais suficientes para construir o gráfico comparativo.",
                meta: "Confirme se os ficheiros de dados incluem o país selecionado.",
                icon: "📉"
            }));
        return;
    }

    // Add change listener
    select.on("change", function() {
        const selectedYear = +this.value;
        if (data[selectedYear]) {
            createBulletGraph(data[selectedYear], baseNominal, country, baseYear);
        } else {
            d3.select("#viz-bullet-graph")
                .html(renderEmptyState({
                    title: "Sem dados para este ano",
                    message: "Não existem valores disponíveis para o ano selecionado.",
                    meta: "Experimente escolher outro ano ou país.",
                    icon: "📉"
                }));
        }
    });

    console.log(`Year selector created for ${country} with`, years.length, "years");
}

export function resetBulletYearSelector(message = "Sem anos disponíveis") {
    const container = d3.select("#bullet-year-selector");
    container.html(`
        <select id="year-select" class="year-select-dropdown" disabled>
            <option>${message}</option>
        </select>
    `);
}
