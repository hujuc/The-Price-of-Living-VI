/**
 * Data Loader Module
 * Handles loading and processing of CSV data
 */

// Centralized country name mapping to handle datasets with different naming conventions
const countryMappings = {
    "Portugal": { pordata: "Portugal", eurostat: "Portugal", display: "Portugal" },
    "Espanha": { pordata: "Espanha", eurostat: "Spain", display: "Espanha" },
    "Spain": { pordata: "Espanha", eurostat: "Spain", display: "Espanha" },
    "França": { pordata: "França", eurostat: "France", display: "França" },
    "France": { pordata: "França", eurostat: "France", display: "França" },
    "Alemanha": { pordata: "Alemanha", eurostat: "Germany", display: "Alemanha" },
    "Germany": { pordata: "Alemanha", eurostat: "Germany", display: "Alemanha" }
};

function getPordataCountryName(country) {
    if (!country) {
        return null;
    }
    return countryMappings[country]?.pordata || country;
}

function getEurostatCountryName(country) {
    if (!country) {
        return null;
    }
    return countryMappings[country]?.eurostat || country;
}

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
 * Optionally filters by country for multi-country datasets
 */
export function processInflationData(data, country = null) {
    const normalizedCountry = getPordataCountryName(country);

    const categories = new Set();
    const years = new Set();

    data.forEach(d => {
        const countryColumn = d["02. Nome País (Europa)"] || d["02. Nome Região (Portugal)"];
        if (normalizedCountry && countryColumn && countryColumn !== normalizedCountry) {
            return;
        }

        const year = +d["01. Ano"];
        const category = d["03. Filtro 1"];
        const value = parseFloat(d["08. Valor"]);

        if (!isNaN(year) && category && !isNaN(value)) {
            categories.add(category);
            years.add(year);
        }
    });

    const sortedYears = Array.from(years).sort((a, b) => a - b);
    const sortedCategories = Array.from(categories).sort();

    const categoriesData = {};

    sortedCategories.forEach(categoryName => {
        categoriesData[categoryName] = {
            name: categoryName,
            values: []
        };
    });

    data.forEach(d => {
        const countryColumn = d["02. Nome País (Europa)"] || d["02. Nome Região (Portugal)"];
        if (normalizedCountry && countryColumn && countryColumn !== normalizedCountry) {
            return;
        }

        const year = +d["01. Ano"];
        const category = d["03. Filtro 1"];
        const value = parseFloat(d["08. Valor"]);

        if (!isNaN(year) && category && !isNaN(value) && categoriesData[category]) {
            categoriesData[category].values.push({
                year,
                value
            });
        }
    });

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
 * Supports both single-country and multi-country datasets
 */
export async function loadInflationByCategories(country = "Portugal") {
    try {
        // Use the multi-country dataset
        const data = await loadCSVData("data/inflacao_portugal_europa.csv");
        if (!data) {
            throw new Error("Failed to load data");
        }

        const processedData = processInflationData(data, country);
        console.log(`Processed data for ${country}:`, processedData);
        return processedData;

    } catch (error) {
        console.error("Error loading inflation categories data:", error);
        return null;
    }
}

/**
 * Get list of available countries in the dataset
 */
export async function getAvailableCountries() {
    try {
        const data = await loadCSVData("data/inflacao_portugal_europa.csv");
        if (!data) {
            return [];
        }

        const countries = new Set();
        data.forEach(d => {
            const country = d["02. Nome País (Europa)"];
            if (country) {
                countries.add(country);
            }
        });

        return Array.from(countries).sort();
    } catch (error) {
        console.error("Error getting available countries:", error);
        return [];
    }
}

/**
 * Load and process minimum wage data for a specific country
 */
export async function loadMinimumWageData(country = "Portugal") {
    try {
        const targetCountry = getPordataCountryName(country);

        if (targetCountry === "Portugal") {
            const nationalData = await loadCSVData("data/salario-minimo-nacional.csv");
            if (!nationalData) {
                throw new Error("Failed to load Portugal wage data");
            }

            const wageData = {};

            nationalData.forEach(row => {
                const indicator = row["03. Indicador"];
                if (!indicator || !indicator.includes("Portugal continental")) {
                    return;
                }

                const year = parseInt(row["01. Ano"]);
                const valueStr = row["09. Valor"];
                if (!year || !valueStr || valueStr === 'x' || valueStr === '-' || valueStr === '-,') {
                    return;
                }

                const value = parseFloat(valueStr.replace(',', '.'));
                if (isNaN(value)) {
                    return;
                }

                wageData[year] = value;
            });

            console.log(`Minimum wage data loaded (Portugal):`, Object.keys(wageData).length, "years");
            return wageData;
        }

        // Use the Europe-wide minimum wage dataset for other countries
        const eurostatData = await loadCSVData("data/salario_minimo_europa.csv");
        if (!eurostatData) {
            throw new Error("Failed to load Eurostat wage data");
        }

        const wageData = {};
        const eurostatCountry = getEurostatCountryName(country);

        eurostatData.forEach(d => {
            const geo = d["geo"];
            const timePeriod = d["TIME_PERIOD"];
            const obsValue = d["OBS_VALUE"];

            if (geo === eurostatCountry && timePeriod && obsValue) {
                const year = parseInt(timePeriod.split("-")[0]);
                const value = parseFloat(obsValue);

                if (!isNaN(year) && !isNaN(value)) {
                    if (!wageData[year] || wageData[year] < value) {
                        wageData[year] = value;
                    }
                }
            }
        });

        console.log(`Minimum wage data loaded (${country}):`, Object.keys(wageData).length, "years");
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
    if (!inflationData || !inflationData.categories) {
        return null;
    }

    // Find Total inflation category
    const totalInflation = inflationData.categories.find(c => c.name === "Total");
    if (!totalInflation) {
        return null;
    }

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
export async function loadBulletGraphData(country = "Portugal") {
    try {
        const [wageData, inflationData] = await Promise.all([
            loadMinimumWageData(country),
            loadInflationByCategories(country)
        ]);

        if (!wageData || !inflationData) {
            throw new Error("Failed to load required data");
        }

        // Get years where we have both wage and inflation data
        const availableYears = Object.keys(wageData)
            .map(y => +y)
            .filter(year => year >= 1974) // Start from when we have wage data
            .sort((a, b) => a - b);

        if (availableYears.length === 0) {
            console.warn(`No wage data available for ${country}`);
            return null;
        }

        const baseYear = availableYears.includes(2012) ? 2012 : availableYears[0];
        const baseNominal = wageData[baseYear];

        if (!baseNominal) {
            console.warn(`Base year nominal wage missing for ${country} (year ${baseYear})`);
        }

        const bulletData = {};

        availableYears.forEach(year => {
            const nominalWage = wageData[year];
            if (nominalWage == null) {
                return;
            }

            const realWage = calculateRealWage(nominalWage, inflationData, year, baseYear);

            if (realWage !== null) {
                bulletData[year] = {
                    year,
                    nominal: nominalWage,
                    real: realWage,
                    baseYear
                };
            }
        });

        console.log(`Bullet graph data prepared for ${country}:`, Object.keys(bulletData).length, "years (base year:", baseYear, ")");
        return { data: bulletData, years: availableYears, baseYear, baseNominal };

    } catch (error) {
        console.error("Error loading bullet graph data:", error);
        return null;
    }
}

/**
 * Load and process HICP data for Europe choropleth map
 */
export async function loadHICPData(country = "Portugal") {
    try {
        const data = await loadCSVData('data/HICP.csv');
        if (!data) {
            return null;
        }

        // Process data by year, country and category
        const processedData = {};
        const years = new Set();
        const categories = new Set();
        const countries = new Set();

        data.forEach(row => {
            const year = parseInt(row["01. Ano"]);
            const countryName = row["02. Nome País (Europa)"];
            const category = row["03. Filtro 1"];
            const valueStr = row["08. Valor"];

            // Skip invalid rows
            if (!year || !category || !valueStr || valueStr === 'x') {
                return;
            }

            const value = parseFloat(valueStr);
            if (isNaN(value)) {
                return;
            }

            // Add to sets
            years.add(year);
            categories.add(category);
            countries.add(countryName);

            // Create nested structure: year -> category -> value
            if (!processedData[year]) {
                processedData[year] = {};
            }
            if (!processedData[year][countryName]) {
                processedData[year][countryName] = {};
            }
            processedData[year][countryName][category] = value;
        });

        const hicpDataForCountry = {
            data: processedData,
            years: Array.from(years).sort((a, b) => a - b),
            categories: Array.from(categories).sort(),
            countries: Array.from(countries).sort(),
            selectedCountry: getPordataCountryName(country) || country
        };

        console.log(`HICP data loaded for ${country}:`, hicpDataForCountry.years.length, "years");
        return hicpDataForCountry;

    } catch (error) {
        console.error("Error loading HICP data:", error);
        return null;
    }
}

/**
 * Load and process income share data for the poorest 40%
 * Combines with inflation data for scatter plot analysis
 */
export async function loadIncomeAndInflationData(country = "Portugal") {
    try {
        const targetCountry = getPordataCountryName(country);

        // Load both datasets
        const [poorIncomeCSV, inflationData] = await Promise.all([
            loadCSVData('data/40-mais-pobres.csv'),
            loadInflationByCategories(country)
        ]);

        if (!poorIncomeCSV || !inflationData) {
            return null;
        }

        // Process income data for selected country
        const countryIncomeData = [];
        const yearsSet = new Set();

        poorIncomeCSV.forEach(row => {
            const year = parseInt(row["01. Ano"]);
            const countryName = row["02. Nome País (Europa)"];
            const valueStr = row["09. Valor"];

            if (countryName === targetCountry && year && valueStr && valueStr !== 'x') {
                const incomeShare = parseFloat(valueStr);
                if (!isNaN(incomeShare)) {
                    countryIncomeData.push({
                        year: year,
                        incomeShare: incomeShare
                    });
                    yearsSet.add(year);
                }
            }
        });

        // Sort by year
        countryIncomeData.sort((a, b) => a.year - b.year);

        // Get total inflation data for selected country
        const totalInflation = inflationData.categories.find(c => c.name === "Total");
        if (!totalInflation) {
            console.error("Total inflation data not found");
            return null;
        }

        // Combine data and calculate year-over-year variations
        const combinedData = [];

        for (let i = 0; i < countryIncomeData.length; i++) {
            const currentYear = countryIncomeData[i].year;
            const incomeShare = countryIncomeData[i].incomeShare;

            // Find inflation rate for current year
            const inflationRate = totalInflation.values.find(v => v.year === currentYear);

            // Calculate inflation variation (difference from previous year)
            let inflationVariation = null;
            const prevYear = currentYear - 1;
            const prevInflation = totalInflation.values.find(v => v.year === prevYear);

            if (inflationRate && prevInflation) {
                inflationVariation = inflationRate.value - prevInflation.value;
            }

            // Calculate income share variation (difference from previous year)
            let incomeVariation = null;
            if (i > 0) {
                const prevIncomeData = countryIncomeData[i - 1];
                // Only calculate if years are consecutive
                if (prevIncomeData.year === currentYear - 1) {
                    incomeVariation = incomeShare - prevIncomeData.incomeShare;
                }
            }

            if (inflationRate) {
                combinedData.push({
                    year: currentYear,
                    incomeShare: incomeShare,
                    inflationRate: inflationRate.value,
                    inflationVariation: inflationVariation,
                    incomeVariation: incomeVariation
                });
            }
        }

        const incomeDataForCountry = {
            data: combinedData,
            years: Array.from(yearsSet).sort((a, b) => a - b),
            country: targetCountry || country
        };

        console.log(`Income and inflation data combined for ${country}:`, incomeDataForCountry.data.length, "data points");
        return incomeDataForCountry;

    } catch (error) {
        console.error("Error loading income and inflation data:", error);
        return null;
    }
}
