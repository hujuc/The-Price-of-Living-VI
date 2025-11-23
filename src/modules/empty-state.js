/**
 * Empty State Utilities Module
 * Provides consistent UI blocks and legacy fallbacks for missing data scenarios
 */

export function renderEmptyState({ title, message, meta = '', icon = 'ℹ️' }) {
    return `
        <div class="viz-empty-state">
            <div class="viz-empty-icon" aria-hidden="true">${icon}</div>
            <div class="viz-empty-content">
                <h4>${title}</h4>
                <p>${message}</p>
                ${meta ? `<div class="viz-empty-meta">${meta}</div>` : ''}
            </div>
        </div>
    `;
}

const legacyEmptyStateCatalog = [
    {
        matcher: /erro ao carregar dados do salário/i,
        payload: {
            title: 'Sem dados de salário mínimo',
            message: 'Não encontrámos informação suficiente para analisar o salário mínimo neste período.',
            meta: 'Selecione outro ano ou país para continuar.',
            icon: '💶'
        }
    },
    {
        matcher: /erro ao carregar dados hicp/i,
        payload: {
            title: 'Sem dados HICP',
            message: 'Não conseguimos carregar o índice harmonizado de preços no consumidor.',
            meta: 'Experimente atualizar os dados ou selecionar outro país.',
            icon: '🗺️'
        }
    },
    {
        matcher: /erro ao carregar dados/i,
        payload: {
            title: 'Dados indisponíveis',
            message: 'Estamos com dificuldades em carregar estes indicadores.',
            meta: 'Verifique a sua ligação ou tente novamente em instantes.',
            icon: '⚠️'
        }
    },
    {
        matcher: /sem dados suficientes/i,
        payload: {
            title: 'Dados insuficientes',
            message: 'Não existem registos completos para construir esta visualização.',
            meta: 'Escolha outras opções ou verifique se os ficheiros CSV incluem o período pretendido.',
            icon: '📉'
        }
    }
];

function transformLegacyMessage(element) {
    if (!element || element.querySelector('.viz-empty-state')) {
        return;
    }

    const text = element.textContent?.trim();
    if (!text) {
        return;
    }

    const entry = legacyEmptyStateCatalog.find(({ matcher }) => matcher.test(text));
    if (entry) {
        element.innerHTML = renderEmptyState(entry.payload);
    }
}

export function upgradeLegacyEmptyStates(root = document) {
    const targets = root.querySelectorAll('.viz-canvas, .map-country-summary');
    targets.forEach(transformLegacyMessage);
}

export function startEmptyStateObserver() {
    if (window.__emptyStateObserverActive) {
        return;
    }

    upgradeLegacyEmptyStates();

    const observer = new MutationObserver(mutations => {
        if (!mutations.some(m => m.type === 'childList' && m.addedNodes.length)) {
            return;
        }
        upgradeLegacyEmptyStates();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.__emptyStateObserverActive = true;
}
