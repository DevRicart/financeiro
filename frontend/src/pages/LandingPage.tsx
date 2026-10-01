import {
  Check,
  CreditCard,
  FileText,
  FileUp,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  Repeat,
  ShieldCheck,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

const CONTACT_EMAIL = "ricardodarkz13@gmail.com";

const NAV_LINKS = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#autonomos", label: "Para autônomos" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#perguntas", label: "Perguntas" },
];

const FAQS = [
  {
    question: "Preciso conectar minha conta do banco?",
    answer: "Não. Você baixa o extrato no app do banco e envia o arquivo. O Lumi Finance nunca pede a senha do seu banco.",
  },
  {
    question: "Quais bancos funcionam?",
    answer: "Qualquer banco que exporte o extrato em OFX, que é a maioria, e também o CSV do PicPay.",
  },
  {
    question: "Meu parceiro vê todas as minhas finanças?",
    answer: "Não. Ele vê só as despesas e metas que você marcar como compartilhadas. Saldos continuam privados.",
  },
  {
    question: "Posso levar meus dados embora?",
    answer: "Sim. Em Relatórios você exporta todas as transações em Excel ou CSV, e pode excluir sua conta quando quiser.",
  },
];

function PillButton({
  to,
  href,
  variant,
  className = "",
  children,
}: {
  to?: string;
  href?: string;
  variant: "solid" | "outline" | "solid-light" | "outline-dark";
  className?: string;
  children: ReactNode;
}) {
  const base = "inline-flex h-[52px] items-center justify-center rounded-[9px] px-6 text-base font-medium transition-colors";
  const variants: Record<typeof variant, string> = {
    solid: "border border-[#1D4A40] bg-[#1D4A40] text-white hover:bg-[#12302A] hover:border-[#12302A]",
    outline: "border border-[#DDE1DB] bg-white text-[#18221F] hover:bg-[#F4F5F2]",
    "solid-light": "border border-white bg-white text-[#1D4A40] hover:bg-[#F4F5F2]",
    "outline-dark": "border border-white/45 bg-transparent text-white hover:bg-white/10",
  };
  const cls = `${base} ${variants[variant]} ${className}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <a href={href} className={cls}>{children}</a>;
}

function CheckItem({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className={`flex items-start gap-3 text-base leading-snug ${dark ? "text-[#DCE8E3]" : "text-[#2F3A36]"}`}>
      <Check size={18} strokeWidth={2.4} className={`mt-[3px] flex-shrink-0 ${dark ? "text-[#A9E2C4]" : "text-[#1D4A40]"}`} />
      <span>{children}</span>
    </div>
  );
}

function IconChip({ icon, dark }: { icon: ReactNode; dark?: boolean }) {
  return (
    <span
      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[11px] ${
        dark ? "bg-white/10" : "bg-[#E5EEEA]"
      }`}
    >
      {icon}
    </span>
  );
}

function PreviewFrame({ children, dark, reverse }: { children: ReactNode; dark?: boolean; reverse?: boolean }) {
  return (
    <div
      className={`rounded-2xl p-2.5 md:p-3.5 lg:flex-1 ${dark ? "bg-white/10" : "bg-[#E7EBE6]"} ${
        reverse ? "lg:order-1" : ""
      }`}
    >
      <div
        className={`overflow-hidden rounded-[10px] border shadow-[0_18px_40px_-24px_rgba(24,34,31,0.35)] ${
          dark ? "border-white/15" : "border-[#DDE1DB]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "neutral" }) {
  const toneClass = tone === "green" ? "text-[#1D4A40]" : tone === "red" ? "text-[#B4473B]" : "text-[#18221F]";
  return (
    <div className="rounded-lg bg-[#F4F5F2] px-3 py-2.5">
      <p className="text-xs text-[#5B6560]">{label}</p>
      <p className={`font-serif text-lg font-medium ${toneClass}`}>{value}</p>
    </div>
  );
}

function DashboardPreview() {
  const bars = [40, 55, 35, 70, 50, 92];
  return (
    <div className="bg-white p-5 md:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-[#5B6560]">Setembro de 2026 · Resultado previsto</p>
      <p className="mt-1.5 font-serif text-3xl font-medium text-[#18221F] md:text-4xl">R$ 2.795,10</p>
      <div className="mt-4 grid grid-cols-2 gap-2.5 md:gap-3">
        <StatChip label="A receber" value="R$ 3.000,00" tone="green" />
        <StatChip label="A pagar" value="R$ 154,90" tone="red" />
      </div>
      <div className="mt-5 flex h-20 items-end gap-2">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-[#1D4A40]" style={{ height: `${h}%`, opacity: 0.55 + i * 0.07 }} />
        ))}
      </div>
    </div>
  );
}

function ImportsPreview() {
  const rows = [
    { desc: "Supermercado Extra", category: "Mercado", amount: "-R$ 289,40" },
    { desc: "Transferência recebida", category: "Salário", amount: "+R$ 3.000,00" },
    { desc: "Uber", category: "Transporte", amount: "-R$ 32,90" },
  ];
  return (
    <div className="bg-white p-5 md:p-6">
      <p className="text-sm font-medium text-[#18221F]">Extrato_Setembro.ofx · 12 movimentações</p>
      <div className="mt-4 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.desc} className="flex items-center gap-3 rounded-lg border border-[#DDE1DB] px-3 py-2.5">
            <span className="h-4 w-4 flex-shrink-0 rounded border border-[#1D4A40]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#18221F]">{row.desc}</p>
              <p className="text-xs text-[#5B6560]">{row.category}</p>
            </div>
            <span className={`text-sm font-medium ${row.amount.startsWith("-") ? "text-[#B4473B]" : "text-[#1D4A40]"}`}>
              {row.amount}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <span className="rounded-[9px] bg-[#1D4A40] px-4 py-2 text-xs font-medium text-white">Confirmar selecionadas</span>
        <span className="rounded-[9px] border border-[#DDE1DB] px-4 py-2 text-xs font-medium text-[#18221F]">Ignorar</span>
      </div>
    </div>
  );
}

function BudgetsPreview() {
  const rows = [
    { name: "Mercado", used: 78, spent: "R$ 780,00", limit: "R$ 1.000,00" },
    { name: "Restaurantes", used: 45, spent: "R$ 225,00", limit: "R$ 500,00" },
    { name: "Bichos de casa", used: 102, spent: "R$ 306,00", limit: "R$ 300,00" },
  ];
  return (
    <div className="bg-white p-5 md:p-6">
      <p className="text-sm font-medium text-[#18221F]">Orçamentos de setembro</p>
      <div className="mt-4 flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.name}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-[#18221F]">{row.name}</span>
              <span className="text-xs text-[#5B6560]">
                {row.spent} de {row.limit}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#F4F5F2]">
              <div
                className={`h-full rounded-full ${row.used > 100 ? "bg-[#B4473B]" : "bg-[#1D4A40]"}`}
                style={{ width: `${Math.min(100, row.used)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalsPreview() {
  const goals = [
    { name: "Carro novo", current: "R$ 6.500,00", target: "R$ 50.000,00", pct: 13 },
    { name: "Viagem de fim de ano", current: "R$ 2.100,00", target: "R$ 6.000,00", pct: 35 },
  ];
  return (
    <div className="bg-white p-5 md:p-6">
      <p className="text-sm font-medium text-[#18221F]">Metas</p>
      <div className="mt-4 flex flex-col gap-4">
        {goals.map((goal) => (
          <div key={goal.name} className="rounded-xl border border-[#DDE1DB] p-4">
            <p className="text-sm font-medium text-[#18221F]">{goal.name}</p>
            <p className="mt-1 font-serif text-xl font-medium text-[#1D4A40]">
              {goal.current} <span className="text-sm font-sans font-normal text-[#5B6560]">de {goal.target}</span>
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F4F5F2]">
              <div className="h-full rounded-full bg-[#1D4A40]" style={{ width: `${goal.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnerPreview() {
  return (
    <div className="bg-white p-5 md:p-6">
      <p className="text-sm font-medium text-[#18221F]">O que fica compartilhado com Marina</p>
      <div className="mt-4 flex flex-col gap-2.5">
        {[
          { label: "Despesas marcadas como compartilhadas", shared: true },
          { label: "Metas marcadas como compartilhadas", shared: true },
          { label: "Saldo das suas contas", shared: false },
          { label: "Limite e fatura dos seus cartões", shared: false },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg border border-[#DDE1DB] px-3 py-2.5">
            <span className="text-sm text-[#18221F]">{item.label}</span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                item.shared ? "bg-[#E5EEEA] text-[#1D4A40]" : "bg-[#F4F5F2] text-[#5B6560]"
              }`}
            >
              {item.shared ? "Visível" : "Privado"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientsPreview() {
  const clients = [
    { name: "Erick Souza", received: "R$ 480,00", pending: "R$ 120,00" },
    { name: "Marina Lopes", received: "R$ 320,00", pending: "R$ 0,00" },
  ];
  return (
    <div className="bg-white p-5 md:p-6">
      <p className="text-sm font-medium text-[#18221F]">Clientes de setembro</p>
      <div className="mt-4 flex flex-col gap-2">
        {clients.map((client) => (
          <div key={client.name} className="flex items-center justify-between rounded-lg border border-[#DDE1DB] px-3 py-2.5">
            <span className="text-sm font-medium text-[#18221F]">{client.name}</span>
            <div className="flex gap-4 text-right text-xs">
              <div>
                <p className="text-[#5B6560]">Recebido</p>
                <p className="font-medium text-[#1D4A40]">{client.received}</p>
              </div>
              <div>
                <p className="text-[#5B6560]">A receber</p>
                <p className="font-medium text-[#18221F]">{client.pending}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FeatureSectionProps {
  id?: string;
  heading: string;
  paragraph: string;
  bullets: string[];
  reverse?: boolean;
  white?: boolean;
  preview: ReactNode;
}

function FeatureSection({ id, heading, paragraph, bullets, reverse, white, preview }: FeatureSectionProps) {
  return (
    <section id={id} className={`border-t border-[#DDE1DB] ${white ? "bg-white" : ""}`}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-9 px-5 py-14 md:px-10 md:py-16 lg:flex-row lg:items-center lg:gap-16 lg:px-20 lg:py-20">
        <div className={`flex flex-col gap-5 lg:w-[460px] lg:flex-shrink-0 ${reverse ? "lg:order-2" : ""}`}>
          <h2 className="font-serif text-[32px] font-medium leading-[1.1] tracking-tight text-[#18221F] md:text-[38px] lg:text-[44px]">
            {heading}
          </h2>
          <p className="text-base leading-relaxed text-[#5B6560] md:text-[17px]">{paragraph}</p>
          <div className="flex flex-col gap-3">
            {bullets.map((bullet) => (
              <CheckItem key={bullet}>{bullet}</CheckItem>
            ))}
          </div>
        </div>
        <PreviewFrame reverse={reverse}>{preview}</PreviewFrame>
      </div>
    </section>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4F5F2] font-sans text-[#18221F]">
      <header className="relative border-b border-[#DDE1DB]">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-5 md:h-[76px] md:px-10 lg:h-[84px] lg:px-20">
          <Link to="/" className="shrink-0">
            <Logo className="h-8 w-auto md:h-9" />
          </Link>
          <nav className="ml-6 hidden gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-[15px] font-medium text-[#2F3A36] hover:text-[#1D4A40]">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="flex h-11 items-center px-3 text-[15px] font-medium text-[#18221F] hover:text-[#1D4A40] md:px-3.5">
              Entrar
            </Link>
            <Link
              to="/register"
              className="hidden h-11 items-center justify-center rounded-[9px] border border-[#1D4A40] bg-[#1D4A40] px-5 text-[15px] font-medium text-white hover:bg-[#12302A] md:inline-flex"
            >
              Criar conta
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-[9px] border border-[#DDE1DB] bg-white text-[#18221F] lg:hidden"
            >
              {menuOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="absolute inset-x-0 top-full z-20 border-b border-[#DDE1DB] bg-white px-5 py-5 shadow-lg lg:hidden">
            <nav className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-[15px] font-medium text-[#2F3A36]"
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex h-11 items-center justify-center rounded-[9px] bg-[#1D4A40] text-[15px] font-medium text-white"
              >
                Criar conta
              </Link>
            </nav>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-[1440px] px-5 pt-9 md:px-10 md:pt-14 lg:flex lg:items-start lg:gap-10 lg:px-20 lg:pt-16 lg:pb-16 xl:pb-0">
          <div className="flex flex-col gap-6 lg:w-[540px] lg:flex-shrink-0 lg:pt-10 xl:gap-7">
            <h1 className="font-serif text-[50px] font-normal leading-[0.98] tracking-[-0.035em] text-[#18221F] md:text-[64px] lg:text-[84px]">
              Seu mês, linha por linha.
            </h1>
            <p className="max-w-[460px] text-[17px] leading-relaxed text-[#5B6560] md:text-[18px] lg:text-[19px]">
              Receitas, despesas, cartões e metas em um só lugar. Importe o extrato do banco, revise em minutos e veja
              para onde o dinheiro está indo.
            </p>
            <div className="flex flex-col items-start gap-2.5 md:flex-row md:items-center">
              <PillButton to="/register" variant="solid">
                Criar conta
              </PillButton>
              <PillButton to="/login" variant="outline">
                Já tenho conta
              </PillButton>
            </div>
            <p className="flex items-start gap-2.5 text-sm leading-snug text-[#5B6560]">
              <ShieldCheck size={18} strokeWidth={1.75} className="mt-0.5 flex-shrink-0 text-[#1D4A40]" />
              Você envia o arquivo do extrato. Sem pedir senha do banco.
            </p>
          </div>

          <div className="mt-8 rounded-2xl bg-[#E7EBE6] p-2.5 md:p-3.5 lg:mt-0 lg:flex-1 xl:absolute xl:left-[47%] xl:top-[72px] xl:w-[62.5%] xl:flex-none">
            <div className="overflow-hidden rounded-xl border border-[#DDE1DB] shadow-[0_30px_60px_-30px_rgba(24,34,31,0.45)]">
              <DashboardPreview />
            </div>
          </div>
        </div>
        <div className="h-9 md:h-14 lg:h-16 xl:h-[72px]" />
      </section>

      <section className="border-y border-[#DDE1DB] bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-5 py-8 md:grid-cols-3 md:gap-6 md:px-10 md:py-8 lg:px-20">
          <div className="flex items-start gap-3.5">
            <IconChip icon={<FileUp size={20} strokeWidth={1.75} className="text-[#1D4A40]" />} />
            <div>
              <p className="text-[15px] font-semibold text-[#18221F]">Extratos OFX e CSV</p>
              <p className="text-sm leading-snug text-[#5B6560]">Funciona com a maioria dos bancos</p>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <IconChip icon={<CreditCard size={20} strokeWidth={1.75} className="text-[#1D4A40]" />} />
            <div>
              <p className="text-[15px] font-semibold text-[#18221F]">Cartões de crédito</p>
              <p className="text-sm leading-snug text-[#5B6560]">Fechamento e vencimento de cada fatura</p>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <IconChip icon={<HeartHandshake size={20} strokeWidth={1.75} className="text-[#1D4A40]" />} />
            <div>
              <p className="text-[15px] font-semibold text-[#18221F]">Finanças a dois</p>
              <p className="text-sm leading-snug text-[#5B6560]">Compartilhe só o que quiser</p>
            </div>
          </div>
        </div>
      </section>

      <FeatureSection
        id="funcionalidades"
        heading="Importe o extrato. Depois é só revisar."
        paragraph="Envie o arquivo OFX ou CSV do seu banco. Cada movimentação chega para revisão: você ajusta a descrição, escolhe a categoria e confirma. Nada vira transação sem o seu ok."
        bullets={[
          "Confirme várias movimentações de uma vez",
          "Ignore o que não deve entrar nas contas",
          "Histórico de cada importação por conta",
        ]}
        preview={<ImportsPreview />}
      />

      <FeatureSection
        heading="Um limite para cada categoria."
        paragraph="Defina quanto quer gastar com mercado, restaurantes ou os bichos de casa. A barra enche conforme você gasta e muda de cor quando passa do limite."
        bullets={["Orçamentos que se renovam todo mês", "Veja quanto ainda resta em cada categoria"]}
        reverse
        preview={<BudgetsPreview />}
      />

      <FeatureSection
        heading="Metas que andam. Dívidas que não se perdem."
        paragraph="Guarde dinheiro para o carro ou para a viagem e acompanhe quanto falta. Registre quem te deve, ou para quem você deve, e cada pagamento feito até quitar."
        bullets={["Metas individuais ou com o parceiro", "Pagamentos parciais registrados um a um"]}
        preview={<GoalsPreview />}
      />

      <section className="bg-[#1D4A40]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-9 px-5 py-14 md:px-10 md:py-16 lg:flex-row lg:items-center lg:gap-16 lg:px-20 lg:py-20">
          <div className="flex flex-col gap-5 lg:w-[460px] lg:flex-shrink-0">
            <h2 className="font-serif text-[32px] font-medium leading-[1.1] tracking-tight text-white md:text-[38px] lg:text-[44px]">
              Finanças a dois, sem abrir a vida inteira.
            </h2>
            <p className="text-base leading-relaxed text-[#C3D6CF] md:text-[17px]">
              Convide quem mora com você. Vocês veem juntos só as despesas e metas marcadas como compartilhadas. O
              resto continua só seu.
            </p>
            <div className="flex flex-col gap-3">
              <CheckItem dark>O vínculo só vale depois que a pessoa aceita o convite</CheckItem>
              <CheckItem dark>Saldos de contas e cartões nunca são mostrados</CheckItem>
              <CheckItem dark>Marque uma despesa como compartilhada na hora de lançar</CheckItem>
            </div>
          </div>
          <PreviewFrame dark>
            <PartnerPreview />
          </PreviewFrame>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-16 lg:px-20 lg:py-20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <h2 className="max-w-[620px] font-serif text-[32px] font-medium leading-[1.1] tracking-tight text-[#18221F] md:text-[38px] lg:text-[44px]">
            E o que mais o dia a dia pede.
          </h2>
          <p className="max-w-[420px] text-base leading-relaxed text-[#5B6560] md:text-[17px]">
            Tudo o que faltava para o controle não depender de planilha nem de memória.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <CreditCard size={20} strokeWidth={1.75} className="text-[#1D4A40]" />,
              title: "Cartões de crédito",
              desc: "Cada compra cai na fatura certa pelo dia de fechamento, e o vencimento aparece no painel.",
            },
            {
              icon: <Repeat size={20} strokeWidth={1.75} className="text-[#1D4A40]" />,
              title: "Recorrências",
              desc: "Salário, aluguel e assinaturas se lançam sozinhos todo mês. Pause quando quiser.",
            },
            {
              icon: <LayoutDashboard size={20} strokeWidth={1.75} className="text-[#1D4A40]" />,
              title: "Painel do mês",
              desc: "O resultado do mês, o que falta receber e o que falta pagar, numa tela só.",
            },
            {
              icon: <FileText size={20} strokeWidth={1.75} className="text-[#1D4A40]" />,
              title: "Relatórios",
              desc: "Resumo mensal em PDF e exportação das transações para Excel ou CSV.",
            },
          ].map((card) => (
            <div key={card.title} className="flex flex-col gap-3.5 rounded-[14px] border border-[#DDE1DB] bg-white p-6">
              <IconChip icon={card.icon} />
              <h3 className="text-lg font-semibold text-[#18221F]">{card.title}</h3>
              <p className="text-[15px] leading-relaxed text-[#5B6560]">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <FeatureSection
        id="autonomos"
        white
        heading="Feito também para quem trabalha por conta própria."
        paragraph="Psicólogos, freelancers e prestadores de serviço: cadastre clientes ou pacientes e veja quanto cada um já pagou e quanto ainda falta receber no mês."
        bullets={["Atendimentos e valores por cliente", "Separe o que é da casa e o que é do trabalho"]}
        reverse
        preview={<ClientsPreview />}
      />

      <section id="como-funciona" className="border-t border-[#DDE1DB]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-16 lg:px-20 lg:py-20">
          <h2 className="font-serif text-[32px] font-medium leading-[1.1] tracking-tight text-[#18221F] md:text-[38px] lg:text-[44px]">
            Comece em três passos.
          </h2>
          <div className="mt-9 grid grid-cols-1 gap-7 md:grid-cols-3 md:gap-10">
            {[
              { n: "1", title: "Crie sua conta", desc: "Nome, e-mail e senha. Leva menos de um minuto." },
              {
                n: "2",
                title: "Cadastre contas e cartões",
                desc: "Diga onde seu dinheiro fica e em que dia cada cartão fecha e vence.",
              },
              {
                n: "3",
                title: "Importe o primeiro extrato",
                desc: "Revise as movimentações e veja o mês se montar sozinho.",
              },
            ].map((step) => (
              <div key={step.n} className="flex flex-col gap-3 border-t-2 border-[#1D4A40] pt-5">
                <span className="font-serif text-4xl leading-none text-[#1D4A40]">{step.n}</span>
                <h3 className="text-lg font-semibold text-[#18221F]">{step.title}</h3>
                <p className="text-[15px] leading-relaxed text-[#5B6560]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="perguntas" className="border-t border-[#DDE1DB]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-9 px-5 py-14 md:px-10 md:py-16 lg:flex-row lg:gap-20 lg:px-20 lg:py-20">
          <div className="flex flex-col gap-4 lg:w-[360px] lg:flex-shrink-0">
            <h2 className="font-serif text-[32px] font-medium leading-[1.1] tracking-tight text-[#18221F] md:text-[38px] lg:text-[44px]">
              Perguntas frequentes
            </h2>
            <p className="max-w-[400px] text-base leading-relaxed text-[#5B6560]">
              Não encontrou o que procurava? Escreva para{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-[#1D4A40] hover:text-[#12302A]">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-9">
            {FAQS.map((faq) => (
              <div key={faq.question} className="flex flex-col gap-2 border-t border-[#DDE1DB] pt-5">
                <h3 className="text-[17px] font-semibold leading-snug text-[#18221F] lg:text-lg">{faq.question}</h3>
                <p className="text-[15px] leading-relaxed text-[#5B6560] lg:text-base">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-0 md:px-10 lg:px-20">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-5 rounded-[20px] bg-[#1D4A40] px-6 py-11 text-center md:gap-6 md:px-12 md:py-16 lg:py-20">
          <h2 className="max-w-[760px] font-serif text-[36px] font-normal leading-[1.05] tracking-tight text-white md:text-[48px] lg:text-[60px]">
            O próximo mês já pode começar organizado.
          </h2>
          <p className="text-[17px] text-[#C3D6CF] md:text-lg">Crie sua conta e importe o primeiro extrato hoje.</p>
          <div className="flex w-full flex-col gap-2.5 md:w-auto md:flex-row">
            <PillButton to="/register" variant="solid-light" className="md:w-auto">
              Criar conta
            </PillButton>
            <PillButton to="/login" variant="outline-dark" className="md:w-auto">
              Entrar
            </PillButton>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-12 md:px-10 lg:flex-row lg:items-center lg:gap-10 lg:px-20 lg:py-12">
        <span className="font-serif text-xl font-medium text-[#18221F] md:text-[22px]">Lumi Finance</span>
        <span className="text-sm text-[#5B6560] lg:order-3 lg:ml-auto">© 2026 Lumi Finance</span>
        <nav className="flex flex-wrap gap-x-6 gap-y-3 lg:order-2">
          {[
            { href: "#funcionalidades", label: "Funcionalidades" },
            { href: "#perguntas", label: "Perguntas" },
          ].map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-[#5B6560] hover:text-[#1D4A40]">
              {link.label}
            </a>
          ))}
          <Link to="/login" className="text-sm text-[#5B6560] hover:text-[#1D4A40]">
            Entrar
          </Link>
          <Link to="/register" className="text-sm text-[#5B6560] hover:text-[#1D4A40]">
            Criar conta
          </Link>
        </nav>
      </footer>
    </div>
  );
}
