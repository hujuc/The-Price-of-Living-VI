/**
 * Radar Chart Module
 * Creates radar/spider charts for comparing inflation across categories
 */

import { wrapText } from './utils.js';
import { renderEmptyState } from './empty-state.js';

let currentCountry = "Portugal";

/**
 * Create radar chart for inflation by category
 * Compares multiple years across all categories
 */
export function createRadarChart(data, selectedYears, country = "Portugal") {
    currentCountry = country;
    const container = d3.select("#viz-inflation-categories");
    container.html("");

    // Filter out the Total category for radar chart
    const categories = data.categories.filter(c => c.name !== "Total");

    if (categories.length === 0) {
        container.html(renderEmptyState({
            title: "Sem categorias disponíveis",
            message: "Não há dados suficientes para construir o radar de inflação por categoria.",
            meta: "Verifique se a base inclui valores além do total.",
            icon: "🕸️"
        }));
        return;
    }

    // Set dimensions
    const margin = { top: 100, right: 150, bottom: 100, left: 150 };
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    // Create SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${width/2 + margin.left},${height/2 + margin.top})`);

    // Prepare data for selected years
    const radarData = selectedYears.map(year => {
        const yearData = {
            year: year,
            values: []
        };

        categories.forEach(category => {
            const dataPoint = category.values.find(v => v.year === year);
            yearData.values.push({
                category: category.name,
                value: dataPoint ? dataPoint.value : 0
            });
        });

        return yearData;
    });

    // Get all values to determine scale
    const allValues = radarData.flatMap(d => d.values.map(v => v.value));
    const maxValue = d3.max(allValues);
    const minValue = d3.min(allValues);

    // Scales
    const angleSlice = (Math.PI * 2) / categories.length;
    const rScale = d3.scaleLinear()
        .domain([minValue < 0 ? minValue : 0, maxValue])
        .range([0, radius]);

    // Color scale for years
    const colorScale = d3.scaleOrdinal()
        .domain(selectedYears)
        .range(d3.schemeCategory10);

    // Draw circular grid
    const levels = 5;
    for (let level = 1; level <= levels; level++) {
        const levelRadius = radius * (level / levels);

        svg.append("circle")
            .attr("r", levelRadius)
            .attr("fill", "none")
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1);

        // Add value labels
        const value = (maxValue * level / levels).toFixed(1);
        svg.append("text")
            .attr("x", 5)
            .attr("y", -levelRadius)
            .attr("font-size", "10px")
            .attr("fill", "#999")
            .text(value + "%");
    }

    // Draw axes (category lines)
    categories.forEach((category, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const lineCoord = {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle)
        };

        // Draw axis line
        svg.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", lineCoord.x)
            .attr("y2", lineCoord.y)
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1);

        // Add category labels
        const labelCoord = {
            x: (radius + 30) * Math.cos(angle),
            y: (radius + 30) * Math.sin(angle)
        };

        const label = category.name.length > 20 ? category.name.substring(0, 17) + "..." : category.name;

        svg.append("text")
            .attr("x", labelCoord.x)
            .attr("y", labelCoord.y)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "11px")
            .attr("fill", "#333")
            .attr("font-weight", "500")
            .text(label)
            .call(wrapText, 100);
    });

    // Line generator for radar
    const radarLine = d3.lineRadial()
        .radius(point => rScale(point.value))
        .angle((_point, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

    // Draw radar polygons for each year
    radarData.forEach((yearData) => {
        const color = colorScale(yearData.year);

        // Draw filled polygon
        svg.append("path")
            .datum(yearData.values)
            .attr("class", "radar-area")
            .attr("d", radarLine)
            .attr("fill", color)
            .attr("fill-opacity", 0.2)
            .attr("stroke", color)
            .attr("stroke-width", 2);

        // Draw points
        yearData.values.forEach((point, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const r = rScale(point.value);
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);

            svg.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", 4)
                .attr("fill", color)
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .append("title")
                .text(`${yearData.year} - ${point.category}: ${point.value.toFixed(2)}%`);
        });
    });

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${radius + 50}, ${-radius})`);

    selectedYears.forEach((year, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 25})`);

        legendRow.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", colorScale(year))
            .attr("fill-opacity", 0.6);

        legendRow.append("text")
            .attr("x", 25)
            .attr("y", 13)
            .attr("font-size", "12px")
            .text(year);
    });

    // Add title with country name
    const countryNames = {
        "Portugal": "Portugal",
        "Espanha": "Espanha",
        "France": "França",
        "Alemanha": "Alemanha"
    };
    const displayCountry = countryNames[currentCountry] || currentCountry;

    svg.append("text")
        .attr("x", 0)
        .attr("y", -radius - 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#2c3e50")
        .text(`Taxa de Inflação por Categoria - ${displayCountry}`);

    console.log("Radar chart created successfully");
}

/**
 * Setup year selection checkboxes
 */
export function setupYearSelection(data, onUpdateCallback, country = "Portugal") {
    currentCountry = country;
    const yearContainer = d3.select("#year-checkboxes");
    yearContainer.html("");

    // Get available years (sample every 5 years for better UX)
    const allYears = data.years;
    const recentYears = allYears.filter(y => y >= 2000); // Last 24 years
    const olderYears = allYears.filter(y => y < 2000 && y % 10 === 0); // Sample older years
    const displayYears = [...olderYears, ...recentYears].sort((a, b) => b - a);

    // Default selected years (last 5 years)
    const defaultYears = recentYears.slice(-5);

    displayYears.forEach(year => {
        const item = yearContainer.append("div")
            .attr("class", "year-checkbox-item");

        const checkbox = item.append("input")
            .attr("type", "checkbox")
            .attr("id", `year-${year}`)
            .attr("value", year)
            .property("checked", defaultYears.includes(year));

        item.append("label")
            .attr("for", `year-${year}`)
            .text(year);

        // Add event listener
        checkbox.on("change", function() {
            if (onUpdateCallback) {
                onUpdateCallback(data);
            }
        });
    });

    // Initial render with default years
    if (onUpdateCallback) {
        onUpdateCallback(data);
    }
}

/**
 * Update radar chart based on selected years
 */
export function updateRadarChart(data) {
    const selectedYears = [];
    d3.selectAll("#year-checkboxes input:checked").each(function() {
        selectedYears.push(+d3.select(this).attr("value"));
    });

    if (selectedYears.length === 0) {
        d3.select("#viz-inflation-categories")
            .html(renderEmptyState({
                title: "Selecione pelo menos um ano",
                message: "Escolha um ou mais anos para comparar a inflação por categoria.",
                meta: "Pode combinar anos recentes com décadas anteriores para ver tendências.",
                icon: "🗂️"
            }));
        return;
    }

    createRadarChart(data, selectedYears.sort((a, b) => a - b), currentCountry);
}
