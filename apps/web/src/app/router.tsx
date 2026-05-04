import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from '../shared/auth/ProtectedRoute';
import { AppLayout } from '../shared/ui';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AgendaPage } from '../features/visitas/AgendaPage';
import { VisitaDetailPage } from '../features/visitas/VisitaDetailPage';
import { DesignarVisitaPage } from '../features/visitas/DesignarVisitaPage';
import { ExecucaoVisitaPage } from '../features/visitas/ExecucaoVisitaPage';
import { RelatorioPreviewPage } from '../features/visitas/RelatorioPreviewPage';
import { PlanosListPage } from '../features/planos-acao/PlanosListPage';
import { PlanoFormPage } from '../features/planos-acao/PlanoFormPage';
import { PlanoDetailPage } from '../features/planos-acao/PlanoDetailPage';
import { ShowcasePage } from '../features/showcase/ShowcasePage';
import { AssistidosListPage } from '../features/assistidos/AssistidosListPage';
import { AssistidoFormPage } from '../features/assistidos/AssistidoFormPage';
import { HistoricoAssistidoPage } from '../features/historico-assistido/HistoricoAssistidoPage';
import { EducadoresListPage } from '../features/educadores/EducadoresListPage';
import { EducadorFormPage } from '../features/educadores/EducadorFormPage';
import { VisitadoresListPage } from '../features/visitadores/VisitadoresListPage';
import { VisitadorFormPage } from '../features/visitadores/VisitadorFormPage';
import { ConfiguracoesPage } from '../features/configuracoes/ConfiguracoesPage';
import { AuditoriaPage } from '../features/auditoria/AuditoriaPage';
import { SolicitacoesListPage } from '../features/solicitacoes-visita/SolicitacoesListPage';
import { SolicitacaoFormPage } from '../features/solicitacoes-visita/SolicitacaoFormPage';
import { TriagemListPage } from '../features/triagem/TriagemListPage';
import { TriagemDecisionPage } from '../features/triagem/TriagemDecisionPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';

const wrap = (el: React.ReactElement) => (
  <ProtectedRoute>
    <AppLayout>{el}</AppLayout>
  </ProtectedRoute>
);

const router = createBrowserRouter([
  { path: '/auth/callback', element: <AuthCallbackPage /> },

  { path: '/', element: wrap(<DashboardPage />) },

  { path: '/agenda', element: wrap(<AgendaPage />) },
  { path: '/visitas/:id', element: wrap(<VisitaDetailPage />) },
  { path: '/visitas/:id/executar', element: wrap(<ExecucaoVisitaPage />) },
  { path: '/visitas/:id/relatorio', element: wrap(<RelatorioPreviewPage />) },
  { path: '/solicitacoes-visita/:solicitacaoId/designar', element: wrap(<DesignarVisitaPage />) },

  { path: '/assistidos', element: wrap(<AssistidosListPage />) },
  { path: '/assistidos/:id', element: wrap(<AssistidoFormPage />) },
  { path: '/assistidos/:id/historico', element: wrap(<HistoricoAssistidoPage />) },

  { path: '/educadores', element: wrap(<EducadoresListPage />) },
  { path: '/educadores/:id', element: wrap(<EducadorFormPage />) },

  { path: '/visitadores', element: wrap(<VisitadoresListPage />) },
  { path: '/visitadores/:id', element: wrap(<VisitadorFormPage />) },

  { path: '/solicitacoes-visita', element: wrap(<SolicitacoesListPage />) },
  { path: '/solicitacoes-visita/:id', element: wrap(<SolicitacaoFormPage />) },

  { path: '/triagem', element: wrap(<TriagemListPage />) },
  { path: '/triagem/:solicitacaoId', element: wrap(<TriagemDecisionPage />) },

  { path: '/planos-acao', element: wrap(<PlanosListPage />) },
  { path: '/planos-acao/novo', element: wrap(<PlanoFormPage />) },
  { path: '/planos-acao/:id', element: wrap(<PlanoDetailPage />) },
  { path: '/planos-acao/:id/editar', element: wrap(<PlanoFormPage />) },

  { path: '/configuracoes', element: wrap(<ConfiguracoesPage />) },
  { path: '/auditoria', element: wrap(<AuditoriaPage />) },

  { path: '/showcase', element: wrap(<ShowcasePage />) },
  {
    path: '*',
    element: (
      <AppLayout>
        <NotFoundPage />
      </AppLayout>
    ),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
