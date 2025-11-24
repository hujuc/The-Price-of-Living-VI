/**
 * Radar Chart Module
 * Creates radar/spider charts for comparing inflation across categories
 */

import { renderEmptyState } from './empty-state.js';

let currentCountry = "Portugal";
const YEAR_PALETTE = [
    "#1b9e77",
    "#d95f02",
    "#7570b3",
    "#e7298a",
    "#66a61e",
    "#e6ab02"
];

/**
 * Create radar chart for inflation by category
 * Compares multiple years across all categories
 */
export function createRadarChart(data, selectedYears, country = "Portugal") {
    // Switched from radar to grouped bar chart for better quantitative comparison
    currentCountry = country;
    const container = d3.select("#viz-inflation-categories");
    container.html("").style("position", "relative");

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

    const categoryNames = categories.map(c => c.name);
    const categoryLookup = new Map(categories.map(category => [category.name, category]));

    const flattened = [];
    selectedYears.forEach(year => {
        categoryNames.forEach(name => {
            const values = categoryLookup.get(name)?.values || [];
            const point = values.find(v => v.year === year);
            flattened.push({
                year,
                category: name,
                value: point ? point.value : 0
            });
        });
    });

    const valueExtent = d3.extent(flattened, d => d.value);
    const minValue = valueExtent[0] ?? 0;
    const maxValue = valueExtent[1] ?? 0;
    const yMin = minValue > 0 ? 0 : minValue - 0.5;
    const yMax = maxValue < 0 ? 0 : maxValue + 0.5;

    const margin = { top: 100, right: 40, bottom: 90, left: 70 };
    const width = Math.max(container.node().getBoundingClientRect().width - margin.left - margin.right, 320);
    const height = 520 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chartArea = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = container.append("div")
        .attr("class", "bar-chart-tooltip")
        .style("opacity", 0);

    const x0 = d3.scaleBand()
        .domain(categoryNames)
        .range([0, width])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(selectedYears)
        .range([0, x0.bandwidth()])
        .padding(0.15);

    const y = d3.scaleLinear()
        .domain([yMin, yMax])
        .nice()
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(selectedYears)
        .range(selectedYears.map((year, idx) => YEAR_PALETTE[idx % YEAR_PALETTE.length]));

    const defs = svg.append("defs");
    selectedYears.forEach(year => {
        const color = d3.color(colorScale(year)) || d3.color("#4b5563");
        const patternId = `pattern-year-${year}`;
        const pattern = defs.append("pattern")
            .attr("id", patternId)
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", 6)
            .attr("height", 6)
            .attr("patternTransform", "rotate(45)");

        const fillColor = color.copy();
        fillColor.opacity = 0.15;

        pattern.append("rect")
            .attr("width", 6)
            .attr("height", 6)
            .attr("fill", fillColor);

        pattern.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", 6)
            .attr("stroke", color)
            .attr("stroke-width", 1.2);
    });

    chartArea.append("g")
        .attr("class", "y-grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat(""))
        .call(g => g.selectAll("line")
            .attr("stroke", "#e2e8f0")
            .attr("stroke-dasharray", "2 4"))
        .call(g => g.select(".domain").remove());

    chartArea.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d}%`));

    chartArea.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-20)")
        .attr("dx", "-0.6em")
        .attr("dy", "0.8em");

    const zeroLine = y(0);
    const categoryGroups = chartArea.selectAll(".category-group")
        .data(categoryNames)
        .enter()
        .append("g")
        .attr("class", "category-group")
        .attr("transform", d => `translate(${x0(d)},0)`);

    categoryGroups.selectAll("rect")
        .data(categoryName => selectedYears.map(year => {
            const values = categoryLookup.get(categoryName)?.values || [];
            const point = values.find(v => v.year === year);
            return {
                category: categoryName,
                year,
                value: point ? point.value : 0
            };
        }))
        .enter()
        .append("rect")
        .attr("class", "inflation-bar")
        .attr("x", d => x1(d.year))
        .attr("width", x1.bandwidth())
        .attr("y", d => d.value >= 0 ? y(d.value) : zeroLine)
        .attr("height", d => Math.abs(y(d.value) - zeroLine))
        .attr("fill", d => `url(#pattern-year-${d.year})`)
        .attr("stroke", d => colorScale(d.year))
        .attr("stroke-width", 1)
        .on("mouseenter", function(event, d) {
            d3.select(this).attr("stroke-width", 2);
            const [x, yPos] = d3.pointer(event, container.node());
            tooltip
                .style("opacity", 0.97)
                .html(`<strong>${d.year}</strong><br/>${d.category}<br/>${d.value.toFixed(2)}%`)
                .style("left", `${x + 20}px`)
                .style("top", `${yPos - 10}px`);
        })
        .on("mousemove", function(event) {
            const [x, yPos] = d3.pointer(event, container.node());
            tooltip
                .style("left", `${x + 20}px`)
                .style("top", `${yPos - 10}px`);
        })
        .on("mouseleave", function() {
            d3.select(this).attr("stroke-width", 1);
            tooltip.transition().duration(150).style("opacity", 0);
        });

    chartArea.append("text")
        .attr("class", "axis-label")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Taxa de Inflação (%)");

    chartArea.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 60)
        .attr("text-anchor", "middle")
        .text("Categorias de consumo");

    const legend = svg.append("g")
        .attr("class", "bar-chart-legend")
        .attr("transform", `translate(${margin.left}, ${40})`);

    const legendItems = legend.selectAll(".legend-item")
        .data(selectedYears)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * 140}, 0)`);

    legendItems.append("rect")
        .attr("width", 20)
        .attr("height", 20)
        .attr("rx", 4)
        .attr("fill", d => `url(#pattern-year-${d})`)
        .attr("stroke", d => colorScale(d))
        .attr("stroke-width", 1.2);

    legendItems.append("text")
        .attr("x", 30)
        .attr("y", 14)
        .text(d => d)
        .attr("font-weight", 600);

    const countryNames = {
        "Portugal": "Portugal",
        "Espanha": "Espanha",
        "France": "França",
        "Alemanha": "Alemanha"
    };
    const displayCountry = countryNames[currentCountry] || currentCountry;

    svg.append("text")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#1f2937")
        .text(`Taxa de Inflação por Categoria - ${displayCountry}`);
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
