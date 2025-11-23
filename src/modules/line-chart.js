/**
 * Line Chart Module
 * Creates line charts for inflation data over time with category filtering
 */

let chartData = null;
let selectedCategories = new Set();
let currentCountry = "Portugal";

/**
 * Create inflation by categories line chart
 * Shows temporal evolution with Total highlighted and category filters
 */
export function createInflationCategoriesChart(data, country = "Portugal") {
    chartData = data;
    currentCountry = country;

    // Initialize all categories as selected
    selectedCategories.clear();
    data.categories.forEach(c => selectedCategories.add(c.name));

    // Create category filter checkboxes
    createCategoryFilters(data);

    // Draw the chart
    drawChart();
}

/**
 * Create category filter checkboxes
 */
function createCategoryFilters(data) {
    const filterContainer = d3.select("#category-filter-container");
    filterContainer.html("");

    const filterDiv = filterContainer.append("div")
        .attr("class", "category-filters");

    // Find Total and other categories
    const totalCategory = data.categories.find(c => c.name === "Total");
    const otherCategories = data.categories.filter(c => c.name !== "Total");

    // Add Total checkbox (always visible, styled differently)
    const totalItem = filterDiv.append("label")
        .attr("class", "category-filter-item total-category");

    totalItem.append("input")
        .attr("type", "checkbox")
        .attr("checked", true)
        .attr("value", "Total")
        .on("change", function() {
            if (this.checked) {
                selectedCategories.add("Total");
            } else {
                selectedCategories.delete("Total");
            }
            drawChart();
        });

    totalItem.append("span")
        .attr("class", "category-label")
        .text("Total");

    // Add other category checkboxes
    otherCategories.forEach(category => {
        const item = filterDiv.append("label")
            .attr("class", "category-filter-item");

        item.append("input")
            .attr("type", "checkbox")
            .attr("checked", true)
            .attr("value", category.name)
            .on("change", function() {
                if (this.checked) {
                    selectedCategories.add(category.name);
                } else {
                    selectedCategories.delete(category.name);
                }
                drawChart();
            });

        item.append("span")
            .attr("class", "category-label")
            .text(category.name);
    });

    // Add select/deselect all buttons
    const buttonContainer = filterDiv.append("div")
        .attr("class", "filter-buttons");

    buttonContainer.append("button")
        .attr("class", "filter-btn")
        .text("Selecionar Todas")
        .on("click", function() {
            selectedCategories.clear();
            data.categories.forEach(c => selectedCategories.add(c.name));
            filterContainer.selectAll("input[type='checkbox']").property("checked", true);
            drawChart();
        });

    buttonContainer.append("button")
        .attr("class", "filter-btn")
        .text("Desselecionar Todas")
        .on("click", function() {
            selectedCategories.clear();
            filterContainer.selectAll("input[type='checkbox']").property("checked", false);
            drawChart();
        });
}

/**
 * Draw the line chart based on selected categories
 */
function drawChart() {
    const container = d3.select("#viz-inflation-categories");
    container.selectAll("*").remove(); // Remove everything, not just SVG

    // Remove any existing tooltips
    d3.selectAll(".line-chart-tooltip").remove();

    if (selectedCategories.size === 0) {
        container.append("div")
            .attr("class", "empty-message")
            .style("text-align", "center")
            .style("padding", "50px")
            .style("color", "#7f8c8d")
            .text("Selecione pelo menos uma categoria para visualizar");
        return;
    }

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

    // Filter categories based on selection
    const visibleCategories = chartData.categories.filter(c => selectedCategories.has(c.name));
    const totalCategory = visibleCategories.find(c => c.name === "Total");
    const otherCategories = visibleCategories.filter(c => c.name !== "Total");

    // Set scales
    const xScale = d3.scaleLinear()
        .domain([d3.min(chartData.years), d3.max(chartData.years)])
        .range([0, width]);

    const allValues = visibleCategories.flatMap(c => c.values.map(v => v.value));
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

    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "line-chart-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1000");

    // Draw other category lines (thinner, semi-transparent)
    otherCategories.forEach(category => {
        const categoryPath = svg.append("path")
            .datum(category.values)
            .attr("class", `line category-line category-${category.name.replace(/\s+/g, '-')}`)
            .attr("d", line)
            .attr("stroke", colorScale(category.name))
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.6)
            .attr("fill", "none")
            .style("transition", "opacity 0.3s, stroke-width 0.3s")
            .style("cursor", "pointer");

        // Add invisible wider path for easier hovering
        svg.append("path")
            .datum(category.values)
            .attr("class", "line-hover-area")
            .attr("d", line)
            .attr("stroke", "transparent")
            .attr("stroke-width", 10)
            .attr("fill", "none")
            .style("cursor", "pointer")
            .on("mouseover", function(event) {
                // Highlight the line
                categoryPath
                    .attr("stroke-width", 3)
                    .attr("opacity", 1);

                // Show tooltip with category info
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.95);
            })
            .on("mousemove", function(event) {
                // Get mouse position relative to SVG
                const [mouseX] = d3.pointer(event, svg.node());

                // Find closest year
                const year = Math.round(xScale.invert(mouseX));
                const dataPoint = category.values.find(v => v.year === year);

                if (dataPoint) {
                    tooltip.html(`
                        <strong>${category.name}</strong><br/>
                        Ano: ${dataPoint.year}<br/>
                        Inflação: ${dataPoint.value.toFixed(2)}%
                    `)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 28) + "px");
                }
            })
            .on("mouseout", function() {
                // Reset line style
                categoryPath
                    .attr("stroke-width", 1.5)
                    .attr("opacity", 0.6);

                // Hide tooltip
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    });

    // Draw Total line (prominent)
    if (totalCategory) {
        const totalPath = svg.append("path")
            .datum(totalCategory.values)
            .attr("class", "line total-line")
            .attr("d", line)
            .attr("stroke", "#e74c3c")
            .attr("stroke-width", 3)
            .attr("fill", "none")
            .style("cursor", "pointer");

        // Add invisible wider path for Total line hover
        svg.append("path")
            .datum(totalCategory.values)
            .attr("class", "line-hover-area")
            .attr("d", line)
            .attr("stroke", "transparent")
            .attr("stroke-width", 10)
            .attr("fill", "none")
            .style("cursor", "pointer")
            .on("mouseover", function(event) {
                // Highlight the Total line
                totalPath.attr("stroke-width", 5);

                // Show tooltip
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.95);
            })
            .on("mousemove", function(event) {
                // Get mouse position relative to SVG
                const [mouseX] = d3.pointer(event, svg.node());

                // Find closest year
                const year = Math.round(xScale.invert(mouseX));
                const dataPoint = totalCategory.values.find(v => v.year === year);

                if (dataPoint) {
                    tooltip.html(`
                        <strong>Total</strong><br/>
                        Ano: ${dataPoint.year}<br/>
                        Inflação: ${dataPoint.value.toFixed(2)}%
                    `)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 28) + "px");
                }
            })
            .on("mouseout", function() {
                // Reset Total line style
                totalPath.attr("stroke-width", 3);

                // Hide tooltip
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
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
            .attr("opacity", 0.8);

        legend.append("text")
            .attr("x", 25)
            .attr("y", yPos + 4)
            .text(category.name.length > 25 ? category.name.substring(0, 22) + "..." : category.name)
            .attr("font-size", "10px")
            .attr("opacity", 0.8);
    });

    // Add title with country name
    const countryNames = {
        "Portugal": "Portugal",
        "Espanha": "Espanha",
        "France": "França",
        "Alemanha": "Alemanha"
    };
    const displayCountry = countryNames[currentCountry] || currentCountry;
    const minYear = d3.min(chartData.years);
    const maxYear = d3.max(chartData.years);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#2c3e50")
        .text(`Evolução da Taxa de Inflação por Categoria - ${displayCountry} (${minYear}-${maxYear})`);

    console.log("Inflation categories chart created successfully with", selectedCategories.size, "categories");
}
