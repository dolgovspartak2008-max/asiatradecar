import Link from "next/link";
export default function NotFound() { return <section className="page-section"><div className="container empty-state"><h1>Автомобиль не найден</h1><p>Возможно, объявление снято с продажи или ещё не синхронизировано.</p><Link className="button" href="/catalog/korea">Вернуться в каталог</Link></div></section>; }
