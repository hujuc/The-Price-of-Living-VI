/**
 * Scatter Plot Module
 * Analyzes the relationship between inflation and income share of poorest 40%
 */

import { renderEmptyState } from './empty-state.js';

let currentView = "variation"; // "variation" or "timeline"
let scatterData = null;
let currentCountry = "Portugal";

const countryDisplayOverrides = {
    "Spain": "Espanha",
    "Espanha": "Espanha",
    "France": "França",
    "França": "França",
    "Germany": "Alemanha",
    "Alemanha": "Alemanha",
    "Finland": "Finlândia",
    "Finlândia": "Finlândia",
    "Italy": "Itália",
    "Itália": "Itália",
    "Portugal": "Portugal"
};

function getDisplayCountryLabel(country) {
    if (!country) {
        return "Portugal";
    }
    return countryDisplayOverrides[country] || country;
}

function updateScatterNarrativeCountry(country) {
    const label = document.getElementById("scatter-description-country");
    if (!label) {
        return;
    }
    label.textContent = getDisplayCountryLabel(country);
}

function hasValidScatterDataset(data) {
    return !!(data && Array.isArray(data.data) && data.data.length);
}

function updateScatterButtonsState(disabled) {
    const btnVariation = d3.select("#btn-scatter-variation");
    const btnTimeline = d3.select("#btn-scatter-timeline");

    btnVariation
        .attr("disabled", disabled ? true : null)
        .classed("disabled", !!disabled);

    btnTimeline
        .attr("disabled", disabled ? true : null)
        .classed("disabled", !!disabled);

    return { btnVariation, btnTimeline };
}

/**
 * Create scatter plot with specified view
 */
export function createScatterPlot(data, view = "variation", country = "Portugal") {
    scatterData = data;
    currentView = view;
    currentCountry = country;

    const container = d3.select("#viz-scatter-plot");
    container.selectAll("*").remove();

    if (!scatterData || !Array.isArray(scatterData.data) || scatterData.data.length === 0) {
        container.html(renderEmptyState({
            title: "Dados insuficientes",
            message: "Não há registos suficientes para analisar poder de compra neste momento.",
            meta: "Selecione outro país ou período.",
            icon: "📊"
        }));
        return;
    }

    const containerWidth = container.node().getBoundingClientRect().width;
    const margin = { top: 60, right: 40, bottom: 80, left: 80 };
    const width = Math.min(containerWidth - 40, 900) - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    if (view === "variation") {
        drawVariationView(container, svg, width, height, margin);
    } else {
        drawTimelineView(container, svg, width, height, margin);
    }
}

/**
 * View 1: Income variation vs inflation variation (Purchasing Power Analysis)
 */
function drawVariationView(container, svg, width, height, margin) {
    // Filter out data points without both variations
    const plotData = scatterData.data.filter(d =>
        d.inflationVariation !== null && d.incomeVariation !== null
    );

    if (plotData.length === 0) {
        container.html(renderEmptyState({
            title: "Sem dados para variações",
            message: "Faltam dados simultâneos de inflação e rendimento para construir esta comparação.",
            meta: "Tente alternar o país ou mudar para a visão temporal.",
            icon: "🧭"
        }));
        return;
    }

    // Create scales
    const xExtent = d3.extent(plotData, d => d.inflationVariation);
    const xPadding = Math.max((xExtent[1] - xExtent[0]) * 0.1, 0.5);

    const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([0, width]);

    const yExtent = d3.extent(plotData, d => d.incomeVariation);
    const yPadding = Math.max((yExtent[1] - yExtent[0]) * 0.1, 0.1);

    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height, 0]);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(8))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 45)
        .attr("fill", "#333")
        .attr("font-size", "13px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text("Variação da Inflação (p.p.)");

    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(8))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -55)
        .attr("fill", "#333")
        .attr("font-size", "13px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text("Variação da Quota de Rendimento (p.p.)");

    // Add grid lines
    svg.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat(""));

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${height})`)
        .attr("opacity", 0.1)
        .call(d3.axisBottom(xScale)
            .tickSize(-height)
            .tickFormat(""));

    // Add zero lines (cross at origin)
    svg.append("line")
        .attr("x1", xScale(0))
        .attr("x2", xScale(0))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#34495e")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.4);

    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "#34495e")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.4);

    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "scatter-tooltip")
        .style("opacity", 0);

    // Determine color based on quadrant (purchasing power analysis)
    const getColor = (d) => {
        const incomeUp = d.incomeVariation > 0;
        const inflationUp = d.inflationVariation > 0;

        // Quadrant I (top-right): income↑ inflation↑ = Mixed orange (income growing but so is inflation)
        if (incomeUp && inflationUp) return "#f39c12";

        // Quadrant II (top-left): income↑ inflation↓ = Best green (income up, inflation down)
        if (incomeUp && !inflationUp) return "#27ae60";

        // Quadrant III (bottom-left): income↓ inflation↓ = Mixed blue (both decreasing)
        if (!incomeUp && !inflationUp) return "#3498db";

        // Quadrant IV (bottom-right): income↓ inflation↑ = Worst red (income down, inflation up)
        if (!incomeUp && inflationUp) return "#e74c3c";

        return "#95a5a6"; // Fallback gray
    };

    // Add circles
    svg.selectAll("circle")
        .data(plotData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.inflationVariation))
        .attr("cy", d => yScale(d.incomeVariation))
        .attr("r", 6)
        .attr("fill", getColor)
        .attr("opacity", 0.7)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 9)
                .attr("opacity", 1);

            tooltip.transition()
                .duration(200)
                .style("opacity", 0.95);

            tooltip.html(`
                <strong>Ano: ${d.year}</strong><br/>
                Var. quota rendimento: ${d.incomeVariation > 0 ? '+' : ''}${d.incomeVariation.toFixed(2)} p.p.<br/>
                Var. inflação: ${d.inflationVariation > 0 ? '+' : ''}${d.inflationVariation.toFixed(2)} p.p.<br/>
                <small>Quota: ${d.incomeShare.toFixed(1)}% | Inflação: ${d.inflationRate.toFixed(2)}%</small>
            `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 6)
                .attr("opacity", 0.7);

            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Add quadrant labels
    const labelOffset = 15;

    svg.append("text")
        .attr("x", width - labelOffset)
        .attr("y", labelOffset)
        .attr("text-anchor", "end")
        .attr("font-size", "11px")
        .attr("fill", "#27ae60")
        .attr("font-weight", "600")
        .text("↑ Rend. ↓ Infl.");

    svg.append("text")
        .attr("x", width - labelOffset)
        .attr("y", height - labelOffset)
        .attr("text-anchor", "end")
        .attr("font-size", "11px")
        .attr("fill", "#e74c3c")
        .attr("font-weight", "600")
        .text("↓ Rend. ↑ Infl.");

    const displayCountry = getDisplayCountryLabel(currentCountry);

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "#2c3e50")
        .text(`Análise do Poder de Compra dos 40% Mais Pobres - ${displayCountry}`);

    // Add subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#7f8c8d")
        .text("Variação de rendimentos vs. variação de inflação (2001-2024, exceto 2004)");
}

/**
 * View 2: Purchasing Power Index over time
 */
function drawTimelineView(container, svg, width, height, margin) {
    const plotData = scatterData.data;
    const displayCountry = getDisplayCountryLabel(currentCountry);

    // Calculate purchasing power index for each year
    // Positive values = better purchasing power (income up more than inflation, or income up and inflation down)
    // Negative values = worse purchasing power
    const dataWithPowerIndex = plotData.map(d => ({
        ...d,
        purchasingPower: d.incomeVariation !== null && d.inflationVariation !== null
            ? d.incomeVariation - d.inflationVariation // Simple but effective: income growth - inflation growth
            : null
    }));

    // Filter data with valid purchasing power index
    const validData = dataWithPowerIndex.filter(d => d.purchasingPower !== null);

    if (validData.length === 0) {
        container.html(renderEmptyState({
            title: "Sem dados para a evolução",
            message: "Não foi possível calcular o índice de poder de compra ano a ano.",
            meta: "Experimente mudar para a visão de variação ou escolha outro país.",
            icon: "📈"
        }));
        return;
    }

    // Create scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(validData, d => d.year))
        .range([0, width]);

    const yExtent = d3.extent(validData, d => d.purchasingPower);
    const yPadding = Math.max((yExtent[1] - yExtent[0]) * 0.15, 0.5);

    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height, 0]);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(12))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 45)
        .attr("fill", "#333")
        .attr("font-size", "13px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text("Ano");

    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(8))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -55)
        .attr("fill", "#333")
        .attr("font-size", "13px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text("Índice de Poder de Compra (p.p.)");

    // Add grid lines
    svg.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat(""));

    // Add zero reference line
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "#34495e")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.5);

    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "scatter-tooltip")
        .style("opacity", 0);

    // Add area below/above zero line
    const area = d3.area()
        .x(d => xScale(d.year))
        .y0(yScale(0))
        .y1(d => yScale(d.purchasingPower))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(validData)
        .attr("fill", "url(#power-gradient)")
        .attr("opacity", 0.3)
        .attr("d", area);

    // Define gradient for area
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "power-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#27ae60")
        .attr("stop-opacity", 0.8);

    gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#f39c12")
        .attr("stop-opacity", 0.3);

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#e74c3c")
        .attr("stop-opacity", 0.8);

    // Add connecting line
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.purchasingPower))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(validData)
        .attr("fill", "none")
        .attr("stroke", "#2c3e50")
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // Add circles
    svg.selectAll("circle")
        .data(validData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.purchasingPower))
        .attr("r", 5)
        .attr("fill", d => d.purchasingPower > 0 ? "#27ae60" : "#e74c3c")
        .attr("opacity", 0.9)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 8)
                .attr("opacity", 1);

            tooltip.transition()
                .duration(200)
                .style("opacity", 0.95);

            const interpretation = d.purchasingPower > 0
                ? "Ganho de poder de compra"
                : "Perda de poder de compra";

            tooltip.html(`
                <strong>Ano: ${d.year}</strong><br/>
                Índice: ${d.purchasingPower > 0 ? '+' : ''}${d.purchasingPower.toFixed(2)} p.p.<br/>
                <em>${interpretation}</em><br/>
                <small>Var. rendimento: ${d.incomeVariation > 0 ? '+' : ''}${d.incomeVariation.toFixed(2)} p.p.</small><br/>
                <small>Var. inflação: ${d.inflationVariation > 0 ? '+' : ''}${d.inflationVariation.toFixed(2)} p.p.</small>
            `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 5)
                .attr("opacity", 0.9);

            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "#2c3e50")
        .text(`Evolução do Poder de Compra dos 40% Mais Pobres – ${displayCountry}`);

    // Add subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#7f8c8d")
        .text("Índice = Variação Rendimento - Variação Inflação (2001-2024, exceto 2004)");

    // Add interpretation labels
    svg.append("text")
        .attr("x", 10)
        .attr("y", 15)
        .attr("font-size", "10px")
        .attr("fill", "#27ae60")
        .attr("font-weight", "600")
        .text("↑ Ganho de poder de compra");

    svg.append("text")
        .attr("x", 10)
        .attr("y", height - 10)
        .attr("font-size", "10px")
        .attr("fill", "#e74c3c")
        .attr("font-weight", "600")
        .text("↓ Perda de poder de compra");
}

/**
 * Setup view toggle controls
 */
export function setupScatterControls(data, country = "Portugal") {
    const hasData = hasValidScatterDataset(data);
    const { btnVariation, btnTimeline } = updateScatterButtonsState(!hasData);

    btnVariation.on("click", null);
    btnTimeline.on("click", null);

    if (!hasData) {
        scatterData = null;
        currentCountry = country;
        updateScatterNarrativeCountry(currentCountry);
        btnVariation.classed("active", true);
        btnTimeline.classed("active", false);
        toggleDescriptions("variation");
        return;
    }

    scatterData = data;
    currentCountry = country;
    updateScatterNarrativeCountry(currentCountry);

    btnVariation.classed("active", true);
    btnTimeline.classed("active", false);

    // Initial view
    createScatterPlot(scatterData, "variation", currentCountry);
    toggleDescriptions("variation");

    btnVariation.on("click", function() {
        if (!hasValidScatterDataset(scatterData)) {
            return;
        }
        btnVariation.classed("active", true);
        btnTimeline.classed("active", false);
        createScatterPlot(scatterData, "variation", currentCountry);
        toggleDescriptions("variation");
    });

    btnTimeline.on("click", function() {
        if (!hasValidScatterDataset(scatterData)) {
            return;
        }
        btnVariation.classed("active", false);
        btnTimeline.classed("active", true);
        createScatterPlot(scatterData, "timeline", currentCountry);
        toggleDescriptions("timeline");
    });
}

export function resetScatterControls() {
    scatterData = null;
    const { btnVariation, btnTimeline } = updateScatterButtonsState(true);
    btnVariation.on("click", null).classed("active", true);
    btnTimeline.on("click", null).classed("active", false);
    updateScatterNarrativeCountry("Portugal");
    toggleDescriptions("variation");
}

/**
 * Toggle visibility of description texts based on view
 */
function toggleDescriptions(view) {
    const variationDesc = document.getElementById("scatter-variation-desc");
    const timelineDesc = document.getElementById("scatter-timeline-desc");

    if (view === "variation") {
        variationDesc.style.display = "block";
        timelineDesc.style.display = "none";
    } else {
        variationDesc.style.display = "none";
        timelineDesc.style.display = "block";
    }
}
