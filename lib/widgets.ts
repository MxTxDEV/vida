import type { WidgetItem } from '@/components/ui/draggable-widget-grid'

/** Every dashboard block. Sizes add up to full rows at four columns. */
export const WIDGETS: WidgetItem[] = [
	{ id: 'rank', size: 'wide', label: 'Ranking do mês' },
	{ id: 'missoes', size: 'wide', label: 'Missões do dia' },
	{ id: 'dias', size: 'wide', label: 'Últimos 30 dias' },
	{ id: 'premios', size: 'wide', label: 'Prêmios e penalidades' },
	{ id: 'metas', size: 'lg', label: 'Metas do período' },
	{ id: 'financas', size: 'wide', label: 'Finanças do mês' },
	{ id: 'nivel', size: 'sm', label: 'Nível' },
	{ id: 'streak', size: 'sm', label: 'Sequência' },
	{ id: 'academia', size: 'sm', label: 'Academia' },
	{ id: 'leitura', size: 'sm', label: 'Leitura' },
	{ id: 'projetos', size: 'sm', label: 'Projetos' },
	{ id: 'conteudo', size: 'sm', label: 'Conteúdo' },
]
