// Publish only confirmed facts. Pending entries are never rendered.
export const SALES = {
  delivery: [
    { status: 'confirmed', title: 'Заявка без зайвих кроків', text: 'Залиште ім’я та телефон у формі. Менеджер зв’яжеться з вами для підтвердження замовлення.' },
    { status: 'confirmed', title: 'Доставка Новою поштою', text: 'Деталі відправлення та вартість доставки уточнюються з менеджером під час підтвердження замовлення.' },
    { status: 'confirmed', title: 'Оплата — після уточнення умов', text: 'Перед оформленням замовлення менеджер розповість про доступні способи оплати. Оберіть варіант після узгодження деталей.' },
  ],
  terms: {
    cashOnDelivery: { status: 'pending', title: 'Післяплата', text: '' },
    cardPayment: { status: 'pending', title: 'Оплата карткою', text: '' },
    freeShipping: { status: 'pending', title: 'Безкоштовна доставка', text: '' },
    dispatchTime: { status: 'pending', title: 'Термін відправлення', text: '' },
    warranty: { status: 'pending', title: 'Гарантійні умови', text: '' },
  },
  kit: {
    status: 'pending', items: [],
    note: 'Точну комплектацію вашого Mini Printer підтвердить менеджер перед оформленням замовлення. Уточніть, які витратні матеріали та аксесуари входять до нього.',
  },
  lifestyles: [
    { title: 'Спогади, нотатки й плани', text: 'Чорно-білі знімки для альбому, короткі конспекти для навчання та списки справ для щоденника.', image: './images/mini-printer-minion.jpg', alt: 'Блакитний Mini Printer друкує чорно-біле зображення міньйонів' },
    { title: 'Наліпки й порядок', text: 'Підписи для коробок і баночок. Для наліпок потрібен самоклейний термопапір.', image: './images/mini-printer-use.jpg', alt: 'Mini Printer поруч із підписаними баночками та органайзерами', placeholder: '' },
  ],
  video: { status: 'confirmed', src: './images/mini-printer-demo.mp4', poster: './images/mini-printer-blue.jpg', width: 1280, height: 720 },
  faq: [
    ['Чи потрібні чорнила для Mini Printer?', 'Ні. Принтер використовує технологію термодруку, тому чорнила та картриджі не потрібні.'],
    ['Чи друкує Mini Printer кольорові фотографії?', 'Ні. Принтер створює чорно-білі зображення на термопапері.'],
    ['Чи можна друкувати наліпки?', 'Так, якщо використовувати сумісний самоклейний термопапір. Звичайний термопапір не має клейового шару.'],
    ['Що входить у комплект?', 'Точну комплектацію менеджер підтвердить під час узгодження замовлення.'],
    ['Як відбувається доставка та оплата?', "Залиште заявку на сайті. Менеджер зв'яжеться з вами, уточнить доступні способи оплати й підтвердить доставку Новою поштою та її вартість."],
  ],
};

export const REVIEWS = { mode: 'production', items: [] };
export const DEMO_REVIEWS = [
  { author: 'Приклад картки 01', text: 'Тут буде підтверджений досвід покупця: що друкували та як користувалися принтером.' },
  { author: 'Приклад картки 02', text: 'Тут можна розмістити реальний відгук про навчання, нотатки або щоденні списки.' },
  { author: 'Приклад картки 03', text: 'Тут буде відгук про замовлення й отримання після перевірки та згоди автора.' },
];

export function reviewState({ mode = REVIEWS.mode, items = REVIEWS.items, hostname = '' } = {}) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  if (mode === 'demo' && local) return { demo: true, items: DEMO_REVIEWS };
  return { demo: false, items: items.filter(item => item.confirmed === true && typeof item.author === 'string' && item.author.trim() && typeof item.text === 'string' && item.text.trim()) };
}
