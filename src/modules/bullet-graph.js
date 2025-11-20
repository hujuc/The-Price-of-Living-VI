/**
 * Bullet Graph Module
 * Compares nominal vs real minimum wage relative to base year 2012
 */

/**
 * Create bullet graph showing nominal vs real wage
 * @param {Object} yearData - Data for selected year {year, nominal, real, baseYear}
 * @param {number} baseNominal - Nominal wage in base year (2012)
 */
export function createBulletGraph(yearData, baseNominal) {
    const container = d3.select("#viz-bullet-graph");
    container.html("");

    if (!yearData) {
        container.html("<div style='text-align: center; padding: 50px;'>Selecione um ano</div>");
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
    const maxValue = Math.max(yearData.nominal, yearData.real, baseNominal) * 1.1;

    const xScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, width]);

    // Define ranges for bullet graph
    const ranges = [
        { level: "poor", value: baseNominal * 0.8, color: "#fee0d2" },
        { level: "fair", value: baseNominal * 0.9, color: "#fcbba1" },
        { level: "good", value: baseNominal, color: "#fc9272" },
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

    // Draw base year reference line (2012)
    svg.append("line")
        .attr("x1", xScale(baseNominal))
        .attr("x2", xScale(baseNominal))
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
        .attr("x", xScale(baseNominal))
        .attr("y", yCenter - barHeight / 2 - 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#3498db")
        .attr("font-weight", "600")
        .text(`Ref 2012: ${baseNominal.toFixed(1)}€`);

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#2c3e50")
        .text(`Salário Mínimo: Nominal vs Real (base 2012)`);

    // Add subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#7f8c8d")
        .text(`Poder de compra do salário em ${yearData.year} comparado com 2012`);

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
        .text("Salário Real = Salário Nominal / Inflação Acumulada");

    explanationGroup.append("text")
        .attr("x", 0)
        .attr("y", 28)
        .attr("font-size", "9px")
        .attr("fill", "#95a5a6")
        .text("Dados: RMMG (salário) + IPC Total (inflação)");

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, ${-40})`);

    const legendItems = [
        { label: "Salário Nominal", color: "#2c3e50", type: "rect" },
        { label: "Salário Real", color: "#e74c3c", type: "line" },
        { label: "Referência 2012", color: "#3498db", type: "dash" }
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
    const difference = yearData.real - baseNominal;
    const percentChange = ((yearData.real - baseNominal) / baseNominal * 100).toFixed(1);

    const diffText = svg.append("text")
        .attr("x", width / 2)
        .attr("y", yCenter + barHeight / 2 + 60)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "600");

    if (difference > 0) {
        diffText.attr("fill", "#27ae60")
            .text(`+${difference.toFixed(1)}€ (+${percentChange}%) em poder de compra vs 2012`);
    } else if (difference < 0) {
        diffText.attr("fill", "#e74c3c")
            .text(`${difference.toFixed(1)}€ (${percentChange}%) em poder de compra vs 2012`);
    } else {
        diffText.attr("fill", "#7f8c8d")
            .text(`Mesmo poder de compra que 2012`);
    }

    console.log("Bullet graph created successfully for year", yearData.year);
}

/**
 * Setup year selector for bullet graph
 */
export function setupBulletYearSelector(bulletGraphData) {
    const container = d3.select("#bullet-year-selector");
    container.html("");

    if (!bulletGraphData || !bulletGraphData.years) {
        console.error("No data available for year selector");
        return;
    }

    const { data, years } = bulletGraphData;
    const baseNominal = data[2012] ? data[2012].nominal : 0;

    // Create dropdown
    const select = container.append("select")
        .attr("id", "year-select")
        .attr("class", "year-select-dropdown");

    // Add option for each year
    years.forEach(year => {
        select.append("option")
            .attr("value", year)
            .property("selected", year === 2020) // Default to 2020
            .text(year);
    });

    // Initial render
    const initialYear = 2020;
    if (data[initialYear]) {
        createBulletGraph(data[initialYear], baseNominal);
    }

    // Add change listener
    select.on("change", function() {
        const selectedYear = +this.value;
        if (data[selectedYear]) {
            createBulletGraph(data[selectedYear], baseNominal);
        }
    });

    console.log("Year selector created with", years.length, "years");
}
