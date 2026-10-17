import { validateProductConfig, deepFreeze } from './product-config-validation.js';

// Approved facts only. Demo is a configuration marker, not an order-flow switch.
export const PRODUCT_CONFIG = deepFreeze(validateProductConfig({
  "mode": "sales",
  "product": {
    "id": "mini-printer",
    "analyticsId": "mini_printer",
    "name": "Mini Printer",
    "shortDescription": "Компактний термопринтер для фото, нотаток і стікерів прямо зі смартфона.",
    "description": "Портативний термопринтер для чорно-білого друку фото, нотаток і списків зі смартфона."
  },
  "pricing": {
    "price": 800,
    "currency": "UAH",
    "currencyLabel": "грн",
    "referencePrice": 1200
  },
  "benefits": [
    {
      "title": "Без чорнил",
      "text": "Термодрук без картриджів. Потрібен лише термопапір."
    },
    {
      "title": "Друк зі смартфона",
      "text": "Підключай через Bluetooth і друкуй зі смартфона."
    },
    {
      "title": "Завжди поруч",
      "text": "Компактний корпус і вбудований акумулятор — бери із собою."
    },
    {
      "title": "Фото та нотатки",
      "text": "Фото, списки й нотатки для щоденних ідей."
    }
  ],
  "specifications": [
    {
      "label": "Тип друку",
      "value": "Термодрук"
    },
    {
      "label": "Колір",
      "value": "Чорно-білий"
    },
    {
      "label": "Ширина друку",
      "value": "53 мм"
    },
    {
      "label": "Підключення",
      "value": "Bluetooth"
    },
    {
      "label": "Сумісність",
      "value": "Android / iOS"
    },
    {
      "label": "Акумулятор",
      "value": "1000 мАг"
    },
    {
      "label": "Розмір",
      "value": "113 × 80 × 38 мм"
    }
  ],
  "media": {
    "hero": {
      "src": "./images/mini-printer-blue.jpg",
      "alt": "Портативний термопринтер Mini Printer",
      "width": 630,
      "height": 630
    },
    "video": {
      "status": "confirmed",
      "src": "./images/mini-printer-demo.mp4",
      "poster": "./images/mini-printer-blue.jpg",
      "width": 1280,
      "height": 720
    }
  },
  "scenarios": [
    {
      "title": "Спогади, нотатки й плани",
      "text": "Чорно-білі знімки для альбому, короткі конспекти для навчання та списки справ для щоденника.",
      "width": 630,
      "height": 630,
      "image": "./images/mini-printer-minion.jpg",
      "alt": "Блакитний Mini Printer друкує чорно-біле зображення міньйонів"
    },
    {
      "title": "Наліпки й порядок",
      "text": "Підписи для коробок і баночок. Для наліпок потрібен самоклейний термопапір.",
      "width": 630,
      "height": 630,
      "image": "./images/mini-printer-use.jpg",
      "alt": "Mini Printer поруч із підписаними баночками та органайзерами",
      "placeholder": ""
    }
  ],
  "commerce": {
    "delivery": [
      {
        "status": "confirmed",
        "title": "Заявка без зайвих кроків",
        "text": "Залиште ім’я та телефон у формі. Менеджер зв’яжеться з вами для підтвердження замовлення."
      },
      {
        "status": "confirmed",
        "title": "Доставка Новою поштою",
        "text": "Деталі відправлення та вартість доставки уточнюються з менеджером під час підтвердження замовлення."
      },
      {
        "status": "confirmed",
        "title": "Оплата — після уточнення умов",
        "text": "Перед оформленням замовлення менеджер розповість про доступні способи оплати. Оберіть варіант після узгодження деталей."
      }
    ],
    "terms": {
      "cashOnDelivery": {
        "status": "pending",
        "title": "Післяплата",
        "text": ""
      },
      "cardPayment": {
        "status": "pending",
        "title": "Оплата карткою",
        "text": ""
      },
      "freeShipping": {
        "status": "pending",
        "title": "Безкоштовна доставка",
        "text": ""
      },
      "dispatchTime": {
        "status": "pending",
        "title": "Термін відправлення",
        "text": ""
      },
      "warranty": {
        "status": "pending",
        "title": "Гарантійні умови",
        "text": ""
      }
    },
    "kit": {
      "status": "pending",
      "items": [],
      "note": "Точну комплектацію вашого Mini Printer підтвердить менеджер перед оформленням замовлення. Уточніть, які витратні матеріали та аксесуари входять до нього."
    }
  },
  "faq": [
    [
      "Чи потрібні чорнила для Mini Printer?",
      "Ні. Принтер використовує технологію термодруку, тому чорнила та картриджі не потрібні."
    ],
    [
      "Чи друкує Mini Printer кольорові фотографії?",
      "Ні. Принтер створює чорно-білі зображення на термопапері."
    ],
    [
      "Чи можна друкувати наліпки?",
      "Так, якщо використовувати сумісний самоклейний термопапір. Звичайний термопапір не має клейового шару."
    ],
    [
      "Що входить у комплект?",
      "Точну комплектацію менеджер підтвердить під час узгодження замовлення."
    ],
    [
      "Як відбувається доставка та оплата?",
      "Залиште заявку на сайті. Менеджер зв'яжеться з вами, уточнить доступні способи оплати й підтвердить доставку Новою поштою та її вартість."
    ]
  ],
  "cta": {
    "header": "Замовити",
    "hero": "Замовити принтер",
    "secondary": "Що можна друкувати ↓",
    "orderTitle": "Замовити Mini Printer",
    "submit": "Надіслати заявку",
    "loading": "Надсилаємо заявку…",
    "sticky": "Замовити ↗"
  },
  "copy": {
    "heroLines": [
      "Миттєвий друк у твоїй кишені.",
      "Без чорнил."
    ],
    "featureHeadingLines": [
      "Менше клопоту.",
      "Більше творчості."
    ],
    "videoHeadingLines": [
      "Mini Printer.",
      "Маленький принтер."
    ],
    "scenariosTitle": "З екрана — у твоє життя.",
    "scenariosEyebrow": "ІДЕЇ НА ЩОДЕНЬ",
    "videoEyebrow": "ВІДЕООГЛЯД",
    "deliveryEyebrow": "ПЕРЕД ЗАМОВЛЕННЯМ",
    "deliveryTitle": "Доставка та оплата",
    "kitTitle": "Що входить у комплект",
    "faqEyebrow": "ЩЕ КІЛЬКА ДЕТАЛЕЙ",
    "faqTitle": "Питання перед покупкою",
    "videoLabel": "Підключення Mini Printer зі смартфона та приклади друку",
    "videoNote": "Термодрук для фото й нотаток. У відео представлені різні кольори принтера — доступний варіант уточнюйте під час замовлення. Для створення наліпок використовуйте самоклейний термопапір.",
    "videoFallbackAlt": "Блакитний Mini Printer — фото товару, не кадр відео",
    "videoFallbackLines": [
      "Відеодемонстрація готується.",
      "Поки що — фото нашого Mini Printer."
    ],
    "kitPaperNote": "Звичайний термопапір — для фото й нотаток. Самоклейний має клейкий шар і потрібен для наліпок; його наявність у комплекті уточнюйте окремо."
  },
  "seo": {
    "title": "Mini Printer — портативний термопринтер",
    "description": "Компактний портативний термопринтер для друку фото, нотаток, списків і наліпок прямо зі смартфона.",
    "canonical": "https://mini-printer-landing.vercel.app/",
    "socialDescription": "Компактний портативний термопринтер для фото, нотаток, списків і наліпок прямо зі смартфона.",
    "width": 630,
      "height": 630,
      "image": "./images/mini-printer-blue.jpg",
    "imageAlt": "Блакитний портативний термопринтер Mini Printer",
    "imageWidth": 630,
    "imageHeight": 630
  }
}));
