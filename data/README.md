# Data Directory

Este diretório contém os datasets utilizados no projeto.

## Datasets Necessários

### 1. Índice de Preços no Consumidor (IPC)
- **Fonte**: [Pordata](https://www.pordata.pt/)
- **Descrição**: Evolução dos preços por categorias (alimentação, energia, habitação, transportes)
- **Formato**: CSV
- **Arquivo**: `cpi_portugal.csv`

### 2. Salário Mínimo Nacional
- **Fonte**: [Pordata](https://www.pordata.pt/)
- **Descrição**: Evolução do salário mínimo em Portugal
- **Formato**: CSV
- **Arquivo**: `minimum_wage_portugal.csv`

### 3. Índice Harmonizado de Preços no Consumidor (HICP)
- **Fonte**: [Eurostat/Pordata](https://www.pordata.pt/)
- **Descrição**: Comparação com média da União Europeia
- **Formato**: CSV
- **Arquivo**: `hicp_portugal_eu.csv`

### 4. Quota de Rendimento dos 40% Mais Pobres
- **Fonte**: [Pordata](https://www.pordata.pt/)
- **Descrição**: Distribuição de rendimento
- **Formato**: CSV
- **Arquivo**: `income_distribution.csv`

### 5. Taxa de Inflação Total e Subjacente
- **Fonte**: [Pordata](https://www.pordata.pt/)
- **Descrição**: Inflação anual total e subjacente (sem energia e alimentos não transformados)
- **Formato**: CSV
- **Arquivo**: `inflation_rates.csv`

## Links Úteis

- [Pordata - Preços](https://www.pordata.pt/tema/portugal/precos-7)
- [Pordata - Salários](https://www.pordata.pt/tema/portugal/salarios-17)
- [Pordata - Distribuição de Rendimento](https://www.pordata.pt/tema/portugal/rendimento+e+condicoes+de+vida-21)

## Formato dos Dados

Todos os ficheiros CSV devem seguir o formato:
```
ano,valor1,valor2,...
2018,x,y,...
2019,x,y,...
```

## Notas

- Manter dados entre 2018-2024 para consistência
- Verificar unidades (%, euros, índice base 100)
- Documentar quaisquer transformações aplicadas aos dados
