/**
 * Line Chart Module
 * Creates line charts for inflation data over time
 */

/**
 * Create inflation by categories line chart
 * Shows temporal evolution with Total highlighted
 */
export function createInflationCategoriesChart(data) {
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

    console.log("Inflation categories chart created successfully");
}
