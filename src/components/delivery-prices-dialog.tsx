"use client";

import Image from "next/image";
import { useId, useRef } from "react";
import { Icon } from "@/components/icons";

const deliveryRates = [
  ["Кемерово", 140_000, 145_000, 150_000, 155_000],
  ["Красноярск", 140_000, 145_000, 150_000, 155_000],
  ["Новосибирск", 140_000, 145_000, 150_000, 155_000],
  ["Барнаул", 165_000, 170_000, 175_000, 180_000],
  ["Омск", 155_000, 160_000, 165_000, 170_000],
  ["Тюмень", 170_000, 175_000, 180_000, 185_000],
  ["Челябинск", 175_000, 180_000, 185_000, 190_000],
  ["Екатеринбург", 175_000, 180_000, 185_000, 190_000],
  ["Уфа", 175_000, 180_000, 185_000, 190_000],
  ["Пермь", 180_000, 185_000, 190_000, 195_000],
  ["Самара", 175_000, 180_000, 185_000, 190_000],
  ["Тольятти", 175_000, 180_000, 185_000, 190_000],
  ["Киров", 190_000, 195_000, 200_000, 205_000],
  ["Ижевск", 190_000, 195_000, 200_000, 205_000],
  ["Санкт-Петербург", 210_000, 215_000, 220_000, 225_000],
  ["Москва", 190_000, 195_000, 200_000, 205_000],
  ["Казань", 190_000, 195_000, 200_000, 205_000],
  ["Нижний Новгород", 190_000, 195_000, 200_000, 205_000],
  ["Пенза", 190_000, 195_000, 200_000, 205_000],
  ["Рязань", 190_000, 195_000, 200_000, 205_000],
  ["Владимир", 190_000, 195_000, 200_000, 205_000],
  ["Воронеж", 200_000, 205_000, 210_000, 215_000],
  ["Саратов", 200_000, 205_000, 210_000, 215_000],
  ["Ростов-на-Дону", 200_000, 205_000, 210_000, 215_000],
  ["Волгоград", 200_000, 205_000, 210_000, 215_000],
  ["Краснодар", 200_000, 205_000, 210_000, 215_000]
] as const;
const deliveryLabels = ["Мини", "Седан", "Кроссовер", "Минивэн, джип"] as const;

export function DeliveryPricesDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button className="delivery-prices-trigger" type="button" onClick={() => dialog.current?.showModal()}><span>Цена доставки по России</span><Icon name="arrow" size={18} /></button>
    <dialog ref={dialog} className="site-dialog delivery-prices-dialog" aria-labelledby={titleId} onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="dialog-panel delivery-prices-panel">
        <button className="dialog-close" type="button" onClick={() => dialog.current?.close()} aria-label="Закрыть цены доставки"><Icon name="x" /></button>
        <p className="eyebrow">Доставка автовозом</p><h2 id={titleId}>Цены доставки по России</h2>
        <div className="delivery-prices-image"><Image src="/media/delivery-prices.png" width={480} height={536} alt="Таблица цен доставки автомобилей из Владивостока и Уссурийска по городам России" /></div>
        <a className="delivery-prices-full" href="/media/delivery-prices.png" target="_blank" rel="noreferrer">Открыть таблицу в полном размере</a>
        <ul className="delivery-prices-mobile">{deliveryRates.map(([city, ...prices]) => <li key={city}><h3>{city}</h3><dl>{prices.map((price, index) => <div key={deliveryLabels[index]}><dt>{deliveryLabels[index]}</dt><dd>{price.toLocaleString("ru-RU")} ₽</dd></div>)}</dl></li>)}</ul>
        <details className="delivery-prices-data"><summary>Цены в текстовом виде</summary><div className="delivery-prices-table-wrap"><table>
          <caption>Доставка автомобилей автовозами из Владивостока и Уссурийска</caption>
          <thead><tr><th scope="col">Город</th><th scope="col">Мини</th><th scope="col">Седан</th><th scope="col">Кроссовер</th><th scope="col">Минивэн, джип</th></tr></thead>
          <tbody>{deliveryRates.map(([city, ...prices]) => <tr key={city}><th scope="row">{city}</th>{prices.map((price) => <td key={price}>{price.toLocaleString("ru-RU")} ₽</td>)}</tr>)}</tbody>
        </table></div><p>Цена перевозки минивэнов и джипов может отличаться в зависимости от габаритов и веса автомобиля.</p><p>Страхование автомобиля оплачивается отдельно: 0,3% от стоимости автомобиля.</p></details>
      </div>
    </dialog>
  </>;
}
