/**
 * Line Chart Module
 * Creates line charts for inflation data over time with category filtering
 */

import { renderEmptyState } from './empty-state.js';

const TOTAL_SERIES = "Total";
const TOTAL_COLOR = "#cf4f48";
// Essential goods activated by default so the chart loads with the core basket in view
const ESSENTIAL_CATEGORIES = [
    "Produtos alimentares e bebidas não alcoólicas",
    "Habitação, água, eletricidade, gás e outros combustíveis",
    "Transportes"
];
const COLORBLIND_SAFE_PALETTE = [
    "#0072B2",
    "#009E73",
    "#CC79A7",
    "#F0E442",
    "#56B4E9",
    "#E69F00",
    "#D55E00",
    "#999999"
];

let chartData = null;
let selectedCategories = new Set();
let focusedCategory = null;
let currentCountry = "Portugal";
const colorAssignments = new Map();

/**
 * Create inflation by categories line chart with a cleaner, focusable view
 */
export function createInflationCategoriesChart(data, country = "Portugal") {
    currentCountry = country;
    focusedCategory = null;

    if (!data || !Array.isArray(data.categories) || data.categories.length === 0) {
        chartData = null;
        selectedCategories.clear();
        focusedCategory = null;
        d3.select("#category-filter-container").html("");
        d3.select("#viz-inflation-categories")
            .html(renderEmptyState({
                title: "Sem dados de inflação",
                message: "Não encontrámos séries para este país neste período.",
                meta: "Selecione outro país no mapa para continuar a explorar.",
                icon: "📉"
            }));
        return;
    }

    chartData = data;
    initializeCategorySelection(data.categories);
    refreshColorAssignments(data.categories);
    createCategoryFilters(data);
    drawChart();
}

export function resetInflationCategoriesState() {
    chartData = null;
    selectedCategories.clear();
    focusedCategory = null;
}

function initializeCategorySelection(categories = []) {
    selectedCategories.clear();

    if (!categories.length) {
        return;
    }

    const categoryNames = categories.map(c => c.name);
    // Default state: apenas Total + bens essenciais começam ativos

    if (categoryNames.includes(TOTAL_SERIES)) {
        selectedCategories.add(TOTAL_SERIES);
    }

    ESSENTIAL_CATEGORIES.forEach(essential => {
        if (categoryNames.includes(essential)) {
            selectedCategories.add(essential);
        }
    });

    if (selectedCategories.size === 0) {
        selectedCategories.add(categoryNames[0]);
    }
}

function refreshColorAssignments(categories = []) {
    colorAssignments.clear();
    const ordered = categories
        .map(c => c.name)
        .filter(name => name !== TOTAL_SERIES);

    ordered.forEach((name, idx) => {
        const paletteIndex = idx % COLORBLIND_SAFE_PALETTE.length;
        colorAssignments.set(name, COLORBLIND_SAFE_PALETTE[paletteIndex]);
    });
}

function getColorForCategory(name) {
    if (name === TOTAL_SERIES) {
        return TOTAL_COLOR;
    }
    if (!colorAssignments.has(name)) {
        const paletteIndex = colorAssignments.size % COLORBLIND_SAFE_PALETTE.length;
        colorAssignments.set(name, COLORBLIND_SAFE_PALETTE[paletteIndex]);
    }
    return colorAssignments.get(name);
}

function createCategoryFilters(data) {
    const filterContainer = d3.select("#category-filter-container");
    filterContainer.html("");

    const filterDiv = filterContainer.append("div")
        .attr("class", "category-filters");

    const totalCategory = data.categories.find(c => c.name === TOTAL_SERIES);
    const otherCategories = data.categories.filter(c => c.name !== TOTAL_SERIES);

    const addCheckbox = (parent, category, isTotal = false) => {
        const item = parent.append("label")
            .attr("class", `category-filter-item${isTotal ? " total-category" : ""}`)
            .attr("data-category", category.name);

        item.append("input")
            .attr("type", "checkbox")
            .property("checked", selectedCategories.has(category.name))
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
    };

    if (totalCategory) {
        addCheckbox(filterDiv, totalCategory, true);
    }

    otherCategories.forEach(category => addCheckbox(filterDiv, category));

    const buttonContainer = filterDiv.append("div")
        .attr("class", "filter-buttons");

    buttonContainer.append("button")
        .attr("class", "filter-btn")
        .text("Selecionar Destaques")
        .on("click", () => {
            initializeCategorySelection(data.categories);
            filterContainer.selectAll("input[type='checkbox']")
                .property("checked", function() {
                    const categoryName = d3.select(this.parentNode).attr("data-category");
                    return selectedCategories.has(categoryName);
                });
            drawChart();
        });

    buttonContainer.append("button")
        .attr("class", "filter-btn")
        .text("Selecionar Todas")
        .on("click", () => {
            selectedCategories.clear();
            data.categories.forEach(c => selectedCategories.add(c.name));
            filterContainer.selectAll("input[type='checkbox']").property("checked", true);
            drawChart();
        });

    buttonContainer.append("button")
        .attr("class", "filter-btn")
        .text("Limpar")
        .on("click", () => {
            selectedCategories.clear();
            filterContainer.selectAll("input[type='checkbox']").property("checked", false);
            drawChart();
        });

    filterContainer.append("p")
        .attr("class", "category-filter-hint")
        .text("Dica: clique numa linha do gráfico para isolá-la e leia o rótulo no final da série para comparar valores.");
}

/**
 * Draws the complete line chart visualization for inflation categories
 * This is the main rendering function that creates a multi-series line chart with interactive features.
 * It handles data validation, creates SVG elements, draws axes and grid, renders multiple category lines,
 * adds interactive tooltips, and places intelligent endpoint labels to avoid overlaps.
 * The chart supports focus mode (clicking a line isolates it) and hover interactions.
 * Total complexity: 267 lines handling scales, axes, series drawing, label placement, and event handlers.
 */
function drawChart() {
    const container = d3.select("#viz-inflation-categories");
    container.selectAll("*").remove();

    if (!chartData || !Array.isArray(chartData.categories)) {
        container.html(renderEmptyState({
            title: "Sem dados de inflação",
            message: "Não conseguimos encontrar séries para o país selecionado.",
            meta: "Selecione outro país para continuar a análise.",
            icon: "📉"
        }));
        return;
    }

    if (selectedCategories.size === 0) {
        container.html(renderEmptyState({
            title: "Selecione uma categoria",
            message: "Ative pelo menos um indicador para gerar o gráfico de inflação.",
            meta: "Use as caixas acima para escolher as séries a analisar.",
            icon: "📈"
        }));
        return;
    }

    if (focusedCategory && !selectedCategories.has(focusedCategory)) {
        focusedCategory = null;
    }

    const visibleCategories = chartData.categories
        .filter(c => selectedCategories.has(c.name))
        .map(c => ({
            ...c,
            values: Array.isArray(c.values)
                ? c.values.filter(v => v?.value != null && !isNaN(v.value))
                : []
        }));

    const categoriesWithData = visibleCategories.filter(c => c.values.length);

    if (!categoriesWithData.length) {
        container.html(renderEmptyState({
            title: "Sem dados de inflação",
            message: "Não encontrámos séries válidas para o país ou categorias selecionadas.",
            meta: "Volte a selecionar as categorias disponíveis ou escolha outro país.",
            icon: "📉"
        }));
        return;
    }

    const wrapper = container.append("div")
        .attr("class", "line-chart-wrapper");

    const margin = { top: 60, right: 80, bottom: 60, left: 70 };
    const nodeWidth = container.node().getBoundingClientRect().width;
    const width = Math.max(nodeWidth - margin.left - margin.right, 320);
    const height = 460 - margin.top - margin.bottom;

    const svg = wrapper.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chartArea = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = wrapper.append("div")
        .attr("class", "line-chart-tooltip")
        .style("opacity", 0);

    const [minYear, maxYear] = d3.extent(chartData.years);
    const allValues = categoriesWithData.flatMap(c => c.values.map(v => v.value));
    const valueExtent = d3.extent(allValues);
    const padding = Math.max((valueExtent[1] - valueExtent[0]) * 0.08, 2);

    const xScale = d3.scaleLinear()
        .domain([minYear, maxYear])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([valueExtent[0] - padding, valueExtent[1] + padding])
        .range([height, 0])
        .nice();

    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

    // Background grid
    chartArea.append("g")
        .attr("class", "grid-lines")
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat(""))
        .selectAll("line")
        .attr("stroke", "#cbd5f5")
        .attr("stroke-dasharray", "3 6")
        .attr("opacity", 0.4);

    const yAxis = chartArea.append("g")
        .attr("class", "axis y-axis")
        .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => `${d.toFixed(0)}%`));
    yAxis.select(".domain").attr("opacity", 0.2);

    const xAxis = chartArea.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("d")));
    xAxis.select(".domain").attr("opacity", 0.2);

    chartArea.append("text")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .text("Ano");

    chartArea.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .text("Taxa de Inflação (%)");

    const countryNames = {
        "Portugal": "Portugal",
        "Espanha": "Espanha",
        "France": "França",
        "Alemanha": "Alemanha"
    };
    const displayCountry = countryNames[currentCountry] || currentCountry;

    svg.append("text")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#1f2937")
        .text(`Inflação por categoria - ${displayCountry} (${minYear}-${maxYear})`);

    const seriesGroup = chartArea.append("g");
    const leaderGroup = chartArea.append("g")
        .attr("class", "label-leader-lines");
    const labelGroup = chartArea.append("g")
        .attr("class", "line-end-labels");
    const labelTargets = [];

    const toggleFocus = (categoryName) => {
        focusedCategory = focusedCategory === categoryName ? null : categoryName;
        drawChart();
    };

    const findClosestPoint = (values, targetYear) => {
        return values.reduce((closest, point) => {
            if (!closest) return point;
            return Math.abs(point.year - targetYear) < Math.abs(closest.year - targetYear)
                ? point
                : closest;
        }, null);
    };

    const handleTooltipMove = (event, category) => {
        const [mouseX, mouseY] = d3.pointer(event, chartArea.node());
        const year = Math.round(xScale.invert(mouseX));
        const dataPoint = findClosestPoint(category.values, year);
        if (!dataPoint) return;

        tooltip
            .style("opacity", 0.95)
            .html(`
                <strong>${category.name}</strong><br/>
                Ano: ${dataPoint.year}<br/>
                Inflação: ${dataPoint.value.toFixed(2)}%
            `)
            .style("left", `${margin.left + mouseX + 15}px`)
            .style("top", `${margin.top + mouseY - 10}px`);
    };

    const handleTooltipOut = () => {
        tooltip.transition().duration(200).style("opacity", 0);
    };

    const drawSeries = category => {
        const color = getColorForCategory(category.name);
        const highlight = focusedCategory
            ? category.name === focusedCategory
            : category.name === TOTAL_SERIES;
        const strokeWidth = highlight ? 3.5 : 2;
        const baseOpacity = focusedCategory
            ? (category.name === focusedCategory ? 1 : 0.15)
            : (category.name === TOTAL_SERIES ? 1 : 0.7);

        const path = seriesGroup.append("path")
            .datum(category.values)
            .attr("class", `category-line line-${category.name.replace(/\s+/g, '-')}`)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", strokeWidth)
            .attr("opacity", baseOpacity)
            .attr("d", line)
            .style("cursor", "pointer")
            .on("click", event => {
                event.stopPropagation();
                toggleFocus(category.name);
            })
            .on("mousemove", event => handleTooltipMove(event, category))
            .on("mouseleave", handleTooltipOut);

        seriesGroup.append("path")
            .datum(category.values)
            .attr("fill", "none")
            .attr("stroke", "transparent")
            .attr("stroke-width", 15)
            .attr("d", line)
            .style("cursor", "pointer")
            .on("click", event => {
                event.stopPropagation();
                toggleFocus(category.name);
            })
            .on("mousemove", event => handleTooltipMove(event, category))
            .on("mouseleave", handleTooltipOut);

        const lastPoint = category.values.reduce((latest, value) => {
            if (!value) return latest;
            if (!latest || value.year > latest.year) {
                return value;
            }
            return latest;
        }, null);

        if (lastPoint) {
            labelTargets.push({
                category: category.name,
                value: lastPoint.value,
                year: lastPoint.year,
                color,
                baseX: xScale(lastPoint.year),
                baseY: yScale(lastPoint.value)
            });
        }

        return path;
    };

    categoriesWithData.forEach(drawSeries);

    placeEndpointLabels({
        targets: labelTargets,
        labelGroup,
        leaderGroup,
        chartWidth: width,
        chartHeight: height,
        focusedCategory,
        toggleFocus
    });

    svg.on("click", () => {
        if (focusedCategory) {
            focusedCategory = null;
            drawChart();
        }
    });

    wrapper.append("p")
        .attr("class", "chart-hint")
        .text("Passe o rato sobre as linhas para ler os valores anuais. Clique para isolar uma categoria e clique novamente para voltar ao overview.");
}

/**
 * Intelligent label placement routine for line chart endpoints
 * This function places labels at the end of each series line, avoiding overlaps through collision detection.
 * It calculates optimal vertical positions, shifts labels when they collide (respecting minimum gap),
 * and draws leader lines connecting labels to their data points when necessary.
 *
 * @param {Array} targets - Array of label targets with {category, value, year, color, baseX, baseY}
 * @param {d3.Selection} labelGroup - D3 selection for the label text elements
 * @param {d3.Selection} leaderGroup - D3 selection for the leader line paths
 * @param {number} chartWidth - Width of the chart area in pixels
 * @param {number} chartHeight - Height of the chart area in pixels
 * @param {string|null} focusedCategory - Currently focused category name (or null)
 * @param {Function} toggleFocus - Callback function to toggle focus on a category
 *
 * Algorithm: sorts labels by Y position, applies collision avoidance in two passes (forward and backward),
 * then renders labels with appropriate anchor points and optional leader lines for clarity.
 */
function placeEndpointLabels({ targets, labelGroup, leaderGroup, chartWidth, chartHeight, focusedCategory, toggleFocus }) {
    if (!targets.length) {
        return;
    }

    const minGap = 18;
    const paddingY = 12;
    const minY = paddingY;
    const maxY = chartHeight - paddingY;

    const layout = targets
        .map(target => ({
            ...target,
            labelY: Math.min(maxY, Math.max(minY, target.baseY))
        }))
        .sort((a, b) => a.labelY - b.labelY);

    for (let i = 1; i < layout.length; i++) {
        const previous = layout[i - 1];
        if (layout[i].labelY - previous.labelY < minGap) {
            layout[i].labelY = previous.labelY + minGap;
        }
    }

    for (let i = layout.length - 2; i >= 0; i--) {
        const next = layout[i + 1];
        if (next.labelY - layout[i].labelY < minGap) {
            layout[i].labelY = next.labelY - minGap;
        }
    }

    layout.forEach(item => {
        item.labelY = Math.min(maxY, Math.max(minY, item.labelY));
    });

    layout.forEach(item => {
        const preferRight = item.baseX < chartWidth - 90;
        let textAnchor = preferRight ? "start" : "end";
        let labelX = preferRight ? item.baseX + 12 : item.baseX - 12;
        labelX = Math.max(12, Math.min(chartWidth - 12, labelX));
        if (labelX >= chartWidth - 14) {
            textAnchor = "end";
        } else if (labelX <= 14) {
            textAnchor = "start";
        }

        const labelClass = [
            "line-end-label",
            item.category === TOTAL_SERIES ? "total" : null,
            focusedCategory && item.category !== focusedCategory ? "dimmed" : null
        ].filter(Boolean).join(" ");

        const leaderNeeded = Math.abs(item.labelY - item.baseY) > 8 || textAnchor === "end";
        if (leaderNeeded) {
            const leaderTargetX = textAnchor === "start" ? labelX - 4 : labelX + 4;
            leaderGroup.append("path")
                .attr("class", "label-leader-line")
                .attr("d", `M${item.baseX},${item.baseY} L${leaderTargetX},${item.labelY}`)
                .attr("stroke", item.color)
                .attr("stroke-width", 1.2)
                .attr("fill", "none");
        }

        labelGroup.append("text")
            .attr("class", labelClass)
            .attr("x", labelX)
            .attr("y", item.labelY)
            .attr("text-anchor", textAnchor)
            .text(`${item.category} · ${item.value.toFixed(1)}%`)
            .on("click", event => {
                event.stopPropagation();
                toggleFocus(item.category);
            });
    });
}
