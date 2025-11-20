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

/**
 * Load and process minimum wage data
 */
export async function loadMinimumWageData() {
    try {
        const data = await loadCSVData("data/salario-minimo-nacional.csv");
        if (!data) {
            throw new Error("Failed to load wage data");
        }

        // Filter for main RMMG (Portugal continental) only
        const wageData = {};

        data.forEach(d => {
            const year = +d["01. Ano"];
            const indicator = d["03. Indicador"];
            const value = parseFloat(d["09. Valor"]);

            // Only use main RMMG for Portugal continental
            if (!isNaN(year) && !isNaN(value) &&
                indicator === "Retribuição mínima mensal garantida (RMMG) - Portugal continental") {
                wageData[year] = value;
            }
        });

        console.log("Minimum wage data loaded:", Object.keys(wageData).length, "years");
        return wageData;

    } catch (error) {
        console.error("Error loading minimum wage data:", error);
        return null;
    }
}

/**
 * Calculate real wage adjusted for inflation
 * Base year is 2012
 */
export function calculateRealWage(nominalWage, inflationData, year, baseYear = 2012) {
    if (!inflationData || !inflationData.categories) return null;

    // Find Total inflation category
    const totalInflation = inflationData.categories.find(c => c.name === "Total");
    if (!totalInflation) return null;

    // Calculate cumulative inflation from base year to target year
    let cumulativeInflation = 1.0;

    if (year > baseYear) {
        // Adjust forward (deflate)
        for (let y = baseYear + 1; y <= year; y++) {
            const inflationRate = totalInflation.values.find(v => v.year === y);
            if (inflationRate) {
                cumulativeInflation *= (1 + inflationRate.value / 100);
            }
        }
        return nominalWage / cumulativeInflation;
    } else if (year < baseYear) {
        // Adjust backward (inflate)
        for (let y = year + 1; y <= baseYear; y++) {
            const inflationRate = totalInflation.values.find(v => v.year === y);
            if (inflationRate) {
                cumulativeInflation *= (1 + inflationRate.value / 100);
            }
        }
        return nominalWage * cumulativeInflation;
    }

    return nominalWage; // Same as base year
}

/**
 * Prepare data for bullet graph comparison
 */
export async function loadBulletGraphData() {
    try {
        const [wageData, inflationData] = await Promise.all([
            loadMinimumWageData(),
            loadInflationByCategories()
        ]);

        if (!wageData || !inflationData) {
            throw new Error("Failed to load required data");
        }

        // Get years where we have both wage and inflation data
        const availableYears = Object.keys(wageData)
            .map(y => +y)
            .filter(year => year >= 1974) // Start from when we have wage data
            .sort((a, b) => a - b);

        const bulletData = {};

        availableYears.forEach(year => {
            const nominalWage = wageData[year];
            const realWage = calculateRealWage(nominalWage, inflationData, year, 2012);

            if (realWage !== null) {
                bulletData[year] = {
                    year: year,
                    nominal: nominalWage,
                    real: realWage,
                    baseYear: 2012
                };
            }
        });

        console.log("Bullet graph data prepared for", Object.keys(bulletData).length, "years");
        return { data: bulletData, years: availableYears };

    } catch (error) {
        console.error("Error loading bullet graph data:", error);
        return null;
    }
}
