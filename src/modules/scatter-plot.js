/**
 * Scatter Plot Module
 * Analyzes the relationship between inflation and income share of poorest 40%
 */

let currentView = "variation"; // "variation" or "timeline"
let scatterData = null;

/**
 * Create scatter plot with specified view
 */
export function createScatterPlot(data, view = "variation") {
    scatterData = data;
    currentView = view;

    const container = d3.select("#viz-scatter-plot");
    container.selectAll("*").remove();

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
        drawVariationView(svg, width, height, margin);
    } else {
        drawTimelineView(svg, width, height, margin);
    }
}

/**
 * View 1: Income share vs inflation variation
 */
function drawVariationView(svg, width, height, margin) {
    // Filter out data points without inflation variation (first year)
    const plotData = scatterData.data.filter(d => d.inflationVariation !== null);

    // Create scales
    const xExtent = d3.extent(plotData, d => d.inflationVariation);
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;

    const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([0, width]);

    const yExtent = d3.extent(plotData, d => d.incomeShare);
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

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
        .text("Variação da Inflação face ao ano anterior (p.p.)");

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
        .text("Quota de Rendimento dos 40% mais pobres (%)");

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

    // Add zero line for x-axis
    svg.append("line")
        .attr("x1", xScale(0))
        .attr("x2", xScale(0))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.6);

    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "scatter-tooltip")
        .style("opacity", 0);

    // Add circles
    svg.selectAll("circle")
        .data(plotData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.inflationVariation))
        .attr("cy", d => yScale(d.incomeShare))
        .attr("r", 6)
        .attr("fill", d => d.inflationVariation > 0 ? "#e74c3c" : "#27ae60")
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
                Quota de rendimento: ${d.incomeShare.toFixed(1)}%<br/>
                Variação inflação: ${d.inflationVariation > 0 ? '+' : ''}${d.inflationVariation.toFixed(2)} p.p.<br/>
                Taxa de inflação: ${d.inflationRate.toFixed(2)}%
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

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "#2c3e50")
        .text("Relação entre Variação da Inflação e Rendimento dos 40% Mais Pobres");

    // Add subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#7f8c8d")
        .text("Cada ponto representa um ano (Portugal, 2001-2024)");
}

/**
 * View 2: Income share vs years (timeline)
 */
function drawTimelineView(svg, width, height, margin) {
    const plotData = scatterData.data;

    // Create scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(plotData, d => d.year))
        .range([0, width]);

    const yExtent = d3.extent(plotData, d => d.incomeShare);
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height, 0]);

    // Color scale based on inflation rate
    const colorScale = d3.scaleSequential()
        .domain(d3.extent(plotData, d => d.inflationRate))
        .interpolator(d3.interpolateRdYlGn)
        .domain(d3.extent(plotData, d => d.inflationRate).reverse()); // Reverse so high inflation = red

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10))
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
        .text("Quota de Rendimento dos 40% mais pobres (%)");

    // Add grid lines
    svg.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat(""));

    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "scatter-tooltip")
        .style("opacity", 0);

    // Add connecting line
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.incomeShare));

    svg.append("path")
        .datum(plotData)
        .attr("fill", "none")
        .attr("stroke", "#3498db")
        .attr("stroke-width", 2)
        .attr("opacity", 0.5)
        .attr("d", line);

    // Add circles
    svg.selectAll("circle")
        .data(plotData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.incomeShare))
        .attr("r", 6)
        .attr("fill", d => colorScale(d.inflationRate))
        .attr("opacity", 0.8)
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
                Quota de rendimento: ${d.incomeShare.toFixed(1)}%<br/>
                Taxa de inflação: ${d.inflationRate.toFixed(2)}%
                ${d.inflationVariation !== null ? `<br/>Variação: ${d.inflationVariation > 0 ? '+' : ''}${d.inflationVariation.toFixed(2)} p.p.` : ''}
            `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 6)
                .attr("opacity", 0.8);

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
        .text("Evolução do Rendimento dos 40% Mais Pobres ao Longo do Tempo");

    // Add subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#7f8c8d")
        .text("Cor indica taxa de inflação (verde = baixa, vermelho = alta)");

    // Add color legend
    addColorLegend(svg, width, height, colorScale);
}

/**
 * Add color legend for timeline view
 */
function addColorLegend(svg, width, height, colorScale) {
    const legendWidth = 200;
    const legendHeight = 15;
    const legendX = width - legendWidth - 10;
    const legendY = height + 55;

    const legendGroup = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    // Create gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "inflation-gradient");

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
        const t = i / numStops;
        gradient.append("stop")
            .attr("offset", `${t * 100}%`)
            .attr("stop-color", colorScale.interpolator()(1 - t)); // Reverse for left-to-right
    }

    // Draw legend rectangle
    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#inflation-gradient)");

    // Add legend labels
    const [min, max] = colorScale.domain().sort((a, b) => a - b);

    legendGroup.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .text(`${min.toFixed(1)}%`);

    legendGroup.append("text")
        .attr("x", legendWidth)
        .attr("y", -5)
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .text(`${max.toFixed(1)}%`);

    legendGroup.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -18)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("fill", "#333")
        .text("Taxa de Inflação");
}

/**
 * Setup view toggle controls
 */
export function setupScatterControls(data) {
    scatterData = data;

    const btnVariation = d3.select("#btn-scatter-variation");
    const btnTimeline = d3.select("#btn-scatter-timeline");

    // Initial view
    createScatterPlot(data, "variation");

    btnVariation.on("click", function() {
        btnVariation.classed("active", true);
        btnTimeline.classed("active", false);
        createScatterPlot(scatterData, "variation");
    });

    btnTimeline.on("click", function() {
        btnVariation.classed("active", false);
        btnTimeline.classed("active", true);
        createScatterPlot(scatterData, "timeline");
    });
}
