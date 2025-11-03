// Main JavaScript file for The Price of Living visualization
// Using D3.js v7

console.log("D3.js version:", d3.version);

// Sample data for testing - Replace with real data later
const sampleInflationData = [
    { year: 2018, inflation: 1.0, coreInflation: 0.8 },
    { year: 2019, inflation: 0.3, coreInflation: 0.5 },
    { year: 2020, inflation: -0.1, coreInflation: 0.4 },
    { year: 2021, inflation: 1.3, coreInflation: 0.9 },
    { year: 2022, inflation: 7.8, coreInflation: 5.2 },
    { year: 2023, inflation: 4.3, coreInflation: 5.7 },
    { year: 2024, inflation: 2.6, coreInflation: 2.8 }
];

// Initialize visualizations when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded. Initializing visualizations...");
    
    // Create test visualizations
    createInflationTimeline();
    createPricesVsWagesChart();
    createIncomeDistributionChart();
    
    // Add smooth scrolling behavior
    initSmoothScroll();
});

/**
 * Visualization 1: Inflation Timeline
 * Shows the evolution of total and core inflation over time
 */
function createInflationTimeline() {
    const container = d3.select("#viz-inflation-timeline");
    
    // Clear any existing content
    container.html("");
    
    // Set dimensions and margins
    const margin = { top: 40, right: 100, bottom: 60, left: 60 };
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Set scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(sampleInflationData, d => d.year))
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([
            d3.min(sampleInflationData, d => Math.min(d.inflation, d.coreInflation)) - 0.5,
            d3.max(sampleInflationData, d => Math.max(d.inflation, d.coreInflation)) + 0.5
        ])
        .range([height, 0]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(yScale);
    
    // Add X axis
    svg.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "#333")
        .attr("font-size", "14px")
        .text("Ano");
    
    // Add Y axis
    svg.append("g")
        .attr("class", "axis y-axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("fill", "#333")
        .attr("font-size", "14px")
        .text("Taxa de Inflação (%)");
    
    // Create line generators
    const lineInflation = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.inflation));
    
    const lineCoreInflation = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.coreInflation));
    
    // Add inflation line
    svg.append("path")
        .datum(sampleInflationData)
        .attr("class", "line")
        .attr("d", lineInflation)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 3);
    
    // Add core inflation line
    svg.append("path")
        .datum(sampleInflationData)
        .attr("class", "line")
        .attr("d", lineCoreInflation)
        .attr("stroke", "#3498db")
        .attr("stroke-width", 3);
    
    // Add dots for inflation
    svg.selectAll(".dot-inflation")
        .data(sampleInflationData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.inflation))
        .attr("r", 5)
        .attr("fill", "#e74c3c");
    
    // Add dots for core inflation
    svg.selectAll(".dot-core")
        .data(sampleInflationData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.coreInflation))
        .attr("r", 5)
        .attr("fill", "#3498db");
    
    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 80}, 10)`);
    
    legend.append("line")
        .attr("x1", 0)
        .attr("x2", 30)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 3);
    
    legend.append("text")
        .attr("x", 35)
        .attr("y", 5)
        .text("Inflação Total")
        .attr("font-size", "12px");
    
    legend.append("line")
        .attr("x1", 0)
        .attr("x2", 30)
        .attr("y1", 25)
        .attr("y2", 25)
        .attr("stroke", "#3498db")
        .attr("stroke-width", 3);
    
    legend.append("text")
        .attr("x", 35)
        .attr("y", 30)
        .text("Inflação Subjacente")
        .attr("font-size", "12px");
    
    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Evolução da Inflação em Portugal (2018-2024)");
    
    console.log("Inflation timeline created successfully");
}

/**
 * Visualization 2: Prices vs Wages
 * Placeholder for comparison between price evolution and wage growth
 */
function createPricesVsWagesChart() {
    const container = d3.select("#viz-prices-wages");
    container.html("");
    
    // Create placeholder
    container.append("div")
        .style("text-align", "center")
        .style("padding", "50px")
        .style("color", "#7f8c8d")
        .html("<p style='font-size: 18px;'>📊 Visualização em Desenvolvimento</p><p>Comparação entre Preços e Salários</p>");
    
    console.log("Prices vs Wages placeholder created");
}

/**
 * Visualization 3: Income Distribution
 * Placeholder for income distribution impact analysis
 */
function createIncomeDistributionChart() {
    const container = d3.select("#viz-income-distribution");
    container.html("");
    
    // Create placeholder
    container.append("div")
        .style("text-align", "center")
        .style("padding", "50px")
        .style("color", "#7f8c8d")
        .html("<p style='font-size: 18px;'>📈 Visualização em Desenvolvimento</p><p>Impacto na Distribuição de Rendimento</p>");
    
    console.log("Income Distribution placeholder created");
}

/**
 * Initialize smooth scrolling for navigation
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Utility function to load CSV data (to be used later)
async function loadData(filepath) {
    try {
        const data = await d3.csv(filepath);
        console.log("Data loaded:", data);
        return data;
    } catch (error) {
        console.error("Error loading data:", error);
        return null;
    }
}

// Make functions available globally if needed
window.visualizations = {
    createInflationTimeline,
    createPricesVsWagesChart,
    createIncomeDistributionChart,
    loadData
};
