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

    // Load and create inflation by categories visualization
    loadInflationByCategories();

    // Create test visualizations
    createInflationTimeline();
    createPricesVsWagesChart();
    createIncomeDistributionChart();

    // Add smooth scrolling behavior
    initSmoothScroll();

    // Setup visualization controls
    setupVisualizationControls();
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

/**
 * Load and visualize inflation by categories data
 */
async function loadInflationByCategories() {
    try {
        const data = await d3.csv("data/inflacao-categorias-portugal.csv");
        console.log("Inflation categories data loaded:", data.length, "rows");

        // Process the data
        const processedData = processInflationData(data);
        console.log("Processed data:", processedData);

        // Create the initial visualization
        createInflationCategoriesChart(processedData);

    } catch (error) {
        console.error("Error loading inflation categories data:", error);
        d3.select("#viz-inflation-categories")
            .html("<div style='text-align: center; padding: 50px; color: #e74c3c;'><p>Erro ao carregar dados</p></div>");
    }
}

/**
 * Process inflation data from CSV
 */
function processInflationData(data) {
    // Group data by year and category
    const categories = new Set();
    const years = new Set();

    data.forEach(d => {
        const year = +d["01. Ano"];
        const category = d["03. Filtro 1"];
        const value = parseFloat(d["08. Valor"]);

        if (!isNaN(year) && category && !isNaN(value)) {
            categories.add(category);
            years.add(year);
        }
    });

    // Convert to sorted arrays
    const sortedYears = Array.from(years).sort((a, b) => a - b);
    const sortedCategories = Array.from(categories).sort();

    // Create data structure for visualization
    const categoriesData = {};

    sortedCategories.forEach(category => {
        categoriesData[category] = {
            name: category,
            values: []
        };
    });

    data.forEach(d => {
        const year = +d["01. Ano"];
        const category = d["03. Filtro 1"];
        const value = parseFloat(d["08. Valor"]);

        if (!isNaN(year) && category && !isNaN(value) && categoriesData[category]) {
            categoriesData[category].values.push({
                year: year,
                value: value
            });
        }
    });

    // Sort values by year for each category
    Object.values(categoriesData).forEach(cat => {
        cat.values.sort((a, b) => a.year - b.year);
    });

    return {
        categories: Object.values(categoriesData),
        years: sortedYears
    };
}

/**
 * Create inflation by categories line chart
 */
function createInflationCategoriesChart(data) {
    const container = d3.select("#viz-inflation-categories");
    container.html("");

    // Set dimensions and margins
    const margin = { top: 60, right: 250, bottom: 80, left: 80 };
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Find Total category and other categories
    const totalCategory = data.categories.find(c => c.name === "Total");
    const otherCategories = data.categories.filter(c => c.name !== "Total");

    // Set scales
    const xScale = d3.scaleLinear()
        .domain([d3.min(data.years), d3.max(data.years)])
        .range([0, width]);

    const allValues = data.categories.flatMap(c => c.values.map(v => v.value));
    const yScale = d3.scaleLinear()
        .domain([d3.min(allValues) - 2, d3.max(allValues) + 2])
        .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10);
    const yAxis = d3.axisLeft(yScale);

    // Add X axis
    svg.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .append("text")
        .attr("x", width / 2)
        .attr("y", 50)
        .attr("fill", "#333")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .text("Ano");

    // Add Y axis
    svg.append("g")
        .attr("class", "axis y-axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -55)
        .attr("fill", "#333")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .attr("text-anchor", "middle")
        .text("Taxa de Inflação (%)");

    // Color scale
    const colorScale = d3.scaleOrdinal()
        .domain(otherCategories.map(c => c.name))
        .range(d3.schemeTableau10);

    // Line generator
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

    // Add grid lines
    svg.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat("")
        );

    // Draw other category lines (thinner, semi-transparent)
    otherCategories.forEach(category => {
        svg.append("path")
            .datum(category.values)
            .attr("class", "line category-line")
            .attr("d", line)
            .attr("stroke", colorScale(category.name))
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.4)
            .attr("fill", "none");
    });

    // Draw Total line (prominent)
    if (totalCategory) {
        svg.append("path")
            .datum(totalCategory.values)
            .attr("class", "line total-line")
            .attr("d", line)
            .attr("stroke", "#e74c3c")
            .attr("stroke-width", 3)
            .attr("fill", "none");
    }

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 20}, 0)`);

    // Add Total to legend first
    if (totalCategory) {
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
            .text("Total")
            .attr("font-size", "12px")
            .attr("font-weight", "bold");
    }

    // Add other categories to legend
    otherCategories.forEach((category, i) => {
        const yPos = (i + 1) * 20;

        legend.append("line")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", yPos)
            .attr("y2", yPos)
            .attr("stroke", colorScale(category.name))
            .attr("stroke-width", 2)
            .attr("opacity", 0.6);

        legend.append("text")
            .attr("x", 25)
            .attr("y", yPos + 4)
            .text(category.name.length > 25 ? category.name.substring(0, 22) + "..." : category.name)
            .attr("font-size", "10px")
            .attr("opacity", 0.7);
    });

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#2c3e50")
        .text("Evolução da Taxa de Inflação por Categoria (1960-2024)");

    // Add interactive tooltips
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "10px")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    console.log("Inflation categories chart created successfully");
}

/**
 * Setup visualization controls (buttons)
 */
function setupVisualizationControls() {
    const btnTimeline = d3.select("#btn-timeline-view");
    const btnAlternative = d3.select("#btn-alternative-view");

    btnTimeline.on("click", function() {
        btnTimeline.classed("active", true);
        btnAlternative.classed("active", false);

        // Reload the timeline view
        loadInflationByCategories();
    });

    btnAlternative.on("click", function() {
        btnTimeline.classed("active", false);
        btnAlternative.classed("active", true);

        // Show alternative visualization (to be implemented)
        d3.select("#viz-inflation-categories")
            .html("<div style='text-align: center; padding: 100px; color: #7f8c8d;'><p style='font-size: 18px;'>📊 Visualização Alternativa</p><p>Em desenvolvimento...</p></div>");
    });
}

// Make functions available globally if needed
window.visualizations = {
    createInflationTimeline,
    createPricesVsWagesChart,
    createIncomeDistributionChart,
    loadData,
    loadInflationByCategories,
    createInflationCategoriesChart
};
