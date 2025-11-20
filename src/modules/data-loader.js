/**
 * Data Loader Module
 * Handles loading and processing of CSV data
 */

/**
 * Load CSV data from file
 */
export async function loadCSVData(filepath) {
    try {
        const data = await d3.csv(filepath);
        console.log(`Data loaded from ${filepath}:`, data.length, "rows");
        return data;
    } catch (error) {
        console.error("Error loading data:", error);
        return null;
    }
}

/**
 * Process inflation data from CSV
 * Groups data by category and year
 */
export function processInflationData(data) {
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
 * Load and process inflation by categories data
 */
export async function loadInflationByCategories() {
    try {
        const data = await loadCSVData("data/inflacao-categorias-portugal.csv");
        if (!data) {
            throw new Error("Failed to load data");
        }

        const processedData = processInflationData(data);
        console.log("Processed data:", processedData);
        return processedData;

    } catch (error) {
        console.error("Error loading inflation categories data:", error);
        return null;
    }
}
