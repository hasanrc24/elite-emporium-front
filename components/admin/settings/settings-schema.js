import { Bell, Boxes, Construction, Globe2, PhoneCall, RotateCcw, Receipt, ShieldCheck, ShoppingCart, Store, Truck } from 'lucide-react';

/**
 * Admin settings layout (FE: "group settings exactly as backend schemas and render control types from
 * explicit frontend definitions"). Each section is one page in the settings sidebar; each card edits a
 * slice of one backend settings group. Field rules mirror the zod schemas in
 * Backend/src/modules/settings/settings.service.ts so mistakes are caught before the round trip; the
 * backend stays authoritative and its fieldErrors are shown on the same fields.
 */

const MONEY = /^\d+(\.\d{1,2})?$/;
const PERCENT = /^\d{1,2}(\.\d{1,4})?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEB_URL = /^https?:\/\/[^\s]+$/i;
const WALLET_NUMBER = /^(\+?88)?01[3-9]\d{8}$/;
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export const SETTINGS_CATEGORIES = [
  { id: 'store', label: 'Store' },
  { id: 'operations', label: 'Operations' },
  { id: 'platform', label: 'Platform' }
];

export const SETTINGS_SECTIONS = [
  {
    id: 'general',
    category: 'store',
    title: 'Store details',
    description: 'Name, logo, contact details and legal information shown to customers.',
    icon: Store,
    cards: [
      {
        id: 'profile',
        group: 'store',
        title: 'Store profile',
        description: 'How your store is named across the storefront, invoices and messages.',
        fields: [
          { path: 'name', type: 'localized', label: 'Store name', required: true, max: 255 },
          { path: 'logo', type: 'logo', label: 'Logo', description: 'Shown in the storefront header, emails and printed documents.' }
        ]
      },
      {
        id: 'contact',
        group: 'store',
        title: 'Contact information',
        description: 'Customers see these in the footer, order emails and the help page.',
        fields: [
          { path: 'contactPhone', type: 'tel', label: 'Phone number', placeholder: '+8801XXXXXXXXX', max: 30 },
          { path: 'contactEmail', type: 'email', label: 'Email address', placeholder: 'support@yourstore.com', max: 190 },
          { path: 'address', type: 'textarea', label: 'Business address', max: 1000, wide: true, placeholder: 'House, road, area, city' }
        ]
      },
      {
        id: 'chat',
        group: 'store',
        title: 'Chat and social',
        description: 'Quick-chat buttons and social profiles linked from the storefront.',
        fields: [
          { path: 'whatsappUrl', type: 'url', label: 'WhatsApp link', placeholder: 'https://wa.me/8801XXXXXXXXX', nullable: true },
          { path: 'messengerUrl', type: 'url', label: 'Messenger link', placeholder: 'https://m.me/yourpage', nullable: true },
          { path: 'socialLinks', type: 'links', label: 'Social profiles', description: 'Facebook, Instagram, TikTok and so on.', max: 20, wide: true }
        ]
      },
      {
        id: 'legal',
        group: 'store',
        title: 'Legal and compliance',
        description: 'Registration numbers printed on invoices. Leave blank if not applicable.',
        fields: [
          { path: 'tradeLicenseNumber', type: 'text', label: 'Trade licence number', max: 80 },
          { path: 'dbid', type: 'text', label: 'DBID', description: 'Digital Business ID', max: 80 },
          { path: 'bin', type: 'text', label: 'VAT BIN', max: 80 }
        ]
      }
    ]
  },
  {
    id: 'checkout',
    category: 'store',
    title: 'Checkout',
    description: 'Order limits, guest checkout, order notes and terms acceptance.',
    icon: ShoppingCart,
    cards: [
      {
        id: 'order-rules',
        group: 'ordering',
        title: 'Order rules',
        description: 'Limits applied to every cart before an order can be placed.',
        fields: [
          { path: 'minimumOrder', type: 'money', label: 'Minimum order value', description: 'Set 0 for no minimum.' },
          { path: 'maximumItemQuantity', type: 'number', label: 'Maximum quantity per item', min: 1, max: 999, suffix: 'pcs' },
          { path: 'orderPrefix', type: 'text', label: 'Order number prefix', description: 'Up to 12 capital letters, numbers or dashes. For example EE-1042.', uppercase: true, pattern: /^[A-Z0-9-]{1,12}$/, patternMessage: 'Use 1–12 capital letters, numbers or dashes.', required: true }
        ]
      },
      {
        id: 'checkout-experience',
        group: 'checkout',
        title: 'Checkout experience',
        description: 'What customers are asked for when they place an order.',
        fields: [
          { path: 'allowGuestCheckout', group: 'ordering', type: 'toggle', label: 'Guest checkout', description: 'Customers can order without creating an account.' },
          { path: 'orderNotesEnabled', type: 'toggle', label: 'Order notes', description: 'Show a notes box for delivery instructions.' },
          { path: 'requireTermsAcceptance', type: 'toggle', label: 'Require terms acceptance', description: 'Customers must tick “I agree to the terms” before ordering.' },
          { path: 'termsPageSlug', type: 'text', label: 'Terms page slug', prefix: '/pages/', description: 'The content page linked from the terms checkbox.', max: 180, dependsOn: 'requireTermsAcceptance' }
        ]
      },
      {
        id: 'manualWallet',
        group: 'manualWallet',
        title: 'Mobile wallet payments',
        description: 'Customers send money to your bKash, Nagad, Rocket or Upay number and submit the TrxID. Staff verify it before the order counts as paid.',
        fields: [
          { path: 'enabled', type: 'toggle', label: 'Accept wallet payments', description: 'Shows a “pay with wallet” step after the order is placed.' },
          { path: 'accounts', type: 'wallets', label: 'Receiving numbers', description: 'Leave a wallet blank to hide it.', dependsOn: 'enabled', wide: true },
          { path: 'instructions', type: 'localized', label: 'Extra instructions', description: 'Optional, for example “Use Send Money, not Payment”.', dependsOn: 'enabled', max: 500, wide: true }
        ]
      }
    ]
  },
  {
    id: 'shipping',
    category: 'store',
    title: 'Shipping and delivery',
    description: 'Delivery rates, free-delivery thresholds and delivery time estimates.',
    icon: Truck,
    cards: [
      { id: 'methods', kind: 'delivery-methods', title: 'Delivery methods', description: 'Rates and payment options offered at checkout. Changes apply immediately, without a deployment.' },
      { id: 'estimates', kind: 'delivery-estimates', group: 'delivery', title: 'Delivery time estimates', description: 'Shown on product pages and at checkout, in both languages.' }
    ]
  },
  {
    id: 'taxes',
    category: 'store',
    title: 'Taxes',
    description: 'VAT collection and how prices are displayed.',
    icon: Receipt,
    cards: [
      {
        id: 'tax',
        group: 'tax',
        title: 'VAT',
        description: 'Applied to order totals when enabled.',
        fields: [
          { path: 'enabled', type: 'toggle', label: 'Charge VAT', description: 'Calculate VAT on every order.' },
          { path: 'pricesIncludeTax', type: 'toggle', label: 'Prices include VAT', description: 'Product prices you enter already contain VAT.', dependsOn: 'enabled' },
          { path: 'rate', type: 'percent', label: 'VAT rate', dependsOn: 'enabled' }
        ]
      }
    ]
  },
  {
    id: 'confirmation',
    category: 'operations',
    title: 'Order confirmation and risk',
    description: 'Cash-on-delivery confirmation calls, SMS links and fraud risk scoring.',
    icon: PhoneCall,
    cards: [
      {
        id: 'confirmation',
        group: 'confirmation',
        title: 'COD order confirmation',
        description: 'Confirm cash-on-delivery orders with the customer before they are packed.',
        fields: [
          { path: 'enabled', type: 'toggle', label: 'Confirm COD orders before packing', description: 'New COD orders wait in the confirmation queue until a staff member confirms them.' },
          { path: 'maxAttempts', type: 'number', label: 'Call attempts before auto-cancel', min: 1, max: 10, suffix: 'attempts', dependsOn: 'enabled' },
          { path: 'maxPendingHours', type: 'number', label: 'Auto-cancel unconfirmed orders after', min: 1, max: 240, suffix: 'hours', dependsOn: 'enabled' },
          { path: 'duplicateWindowMinutes', type: 'number', label: 'Flag repeat orders placed within', description: 'Same phone number, same items. Set 0 to turn off.', min: 0, max: 1440, suffix: 'minutes' },
          { path: 'smsLinkEnabled', type: 'toggle', label: 'Send SMS confirmation link', description: 'Customers can confirm the order themselves from a link.', dependsOn: 'enabled', wide: true },
          { path: 'linkTtlHours', type: 'number', label: 'Confirmation link expires after', min: 1, max: 72, suffix: 'hours', dependsOn: 'smsLinkEnabled' }
        ]
      },
      {
        id: 'risk',
        group: 'risk',
        title: 'COD risk scoring',
        description: 'Scores each checkout from 0–100 using the customer’s past orders and returns.',
        fields: [
          { path: 'enabled', type: 'toggle', label: 'Score COD risk', description: 'Show a risk level on every new order.' },
          { path: 'mediumScore', type: 'number', label: 'Medium risk from score', min: 1, max: 100, suffix: '/ 100', dependsOn: 'enabled' },
          { path: 'highScore', type: 'number', label: 'High risk from score', min: 1, max: 100, suffix: '/ 100', dependsOn: 'enabled' },
          { path: 'newCustomerHighValue', type: 'money', label: 'High-value first order from', description: 'First orders above this amount add to the risk score.', dependsOn: 'enabled' },
          {
            path: 'highRiskAction',
            type: 'choice',
            label: 'When an order is high risk',
            dependsOn: 'enabled',
            wide: true,
            options: [
              { value: 'require_confirmation', label: 'Require confirmation', description: 'Accept the order but always send it to the confirmation queue.' },
              { value: 'block_cod', label: 'Block cash on delivery', description: 'The customer must pay online with bKash.' },
              { value: 'block_order', label: 'Block the order', description: 'The order cannot be placed.' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'inventory',
    category: 'operations',
    title: 'Inventory and catalog',
    description: 'Stock policy, low-stock alerts, cart reservations and publishing rules.',
    icon: Boxes,
    cards: [
      {
        id: 'stock',
        group: 'inventory',
        title: 'Stock',
        description: 'Defaults for new products. Each product can override the stock policy.',
        fields: [
          {
            path: 'defaultStockPolicy',
            type: 'choice',
            label: 'When a product is out of stock',
            wide: true,
            options: [
              { value: 'deny', label: 'Stop selling', description: 'Hide the add-to-cart button.' },
              { value: 'allow_backorder', label: 'Allow backorders', description: 'Keep selling and ship when restocked.' },
              { value: 'preorder', label: 'Take pre-orders', description: 'Sell as a pre-order with a later dispatch date.' },
              { value: 'available', label: 'Always available', description: 'Do not track stock for sales.' }
            ]
          },
          { path: 'lowStockThreshold', type: 'number', label: 'Low stock alert at', min: 0, max: 1000000, suffix: 'pcs' },
          { path: 'reservationMinutes', type: 'number', label: 'Hold stock during checkout for', min: 5, max: 120, suffix: 'minutes' },
          { path: 'showExactStock', type: 'toggle', label: 'Show exact stock to customers', description: 'Display “Only 3 left” instead of just “In stock”.', wide: true }
        ]
      },
      {
        id: 'publishing',
        group: 'catalog',
        title: 'Product publishing',
        description: 'Quality checks a product must pass before it can go live.',
        fields: [
          { path: 'minProductImages', type: 'number', label: 'Minimum images per product', min: 1, max: 20, suffix: 'images' }
        ]
      }
    ]
  },
  {
    id: 'returns',
    category: 'operations',
    title: 'Returns and reviews',
    description: 'Return window, refund timeline and product review moderation.',
    icon: RotateCcw,
    cards: [
      {
        id: 'returns',
        group: 'returns',
        title: 'Returns',
        description: 'Who can request a return and for how long after delivery.',
        fields: [
          { path: 'enabled', type: 'toggle', label: 'Accept return requests', description: 'Customers can start a return from their order page.' },
          { path: 'windowDays', type: 'number', label: 'Return window', min: 0, max: 365, suffix: 'days', description: 'Counted from the delivery date.', dependsOn: 'enabled' },
          { path: 'refundTimelineDays', group: 'delivery', type: 'number', label: 'Refund timeline', min: 1, max: 60, suffix: 'days', description: 'Promised to customers after a return is approved.' },
          { path: 'guestReturns', type: 'toggle', label: 'Allow guest returns', description: 'Guests can request a return with their order number and phone.', dependsOn: 'enabled', wide: true },
          { path: 'exchangeHoldHours', type: 'number', label: 'Size exchange stock hold', min: 1, max: 720, suffix: 'hours', description: 'How long the replacement size is kept for the customer.', dependsOn: 'enabled' },
          { path: 'holdOn', type: 'choice', label: 'Start the hold', dependsOn: 'enabled', wide: true, options: [
            { value: 'request', label: 'When the customer asks', description: 'The replacement size is reserved straight away.' },
            { value: 'approval', label: 'When you approve', description: 'Stock is only reserved after staff approve the exchange.' }
          ] },
          { path: 'excludedProductIds', type: 'products', label: 'Non-returnable products', description: 'These products can never be returned, for example innerwear.', dependsOn: 'enabled', max: 1000, wide: true }
        ]
      },
      {
        id: 'reviews',
        group: 'reviews',
        title: 'Product reviews',
        description: 'Ratings and reviews from customers who bought the product.',
        fields: [
          { path: 'enabled', type: 'toggle', label: 'Accept reviews' },
          { path: 'moderationRequired', type: 'toggle', label: 'Approve reviews before they appear', dependsOn: 'enabled' },
          { path: 'allowUpdates', type: 'toggle', label: 'Customers can edit their reviews', dependsOn: 'enabled' },
          { path: 'mediaEnabled', type: 'toggle', label: 'Allow photos in reviews', dependsOn: 'enabled' }
        ]
      }
    ]
  },
  {
    id: 'notifications',
    category: 'operations',
    title: 'Notifications',
    description: 'Email and SMS messages sent to customers.',
    icon: Bell,
    cards: [
      {
        id: 'channels',
        group: 'notifications',
        title: 'Customer notifications',
        description: 'Channels used for order updates, verification codes and receipts.',
        fields: [
          { path: 'emailEnabled', type: 'toggle', label: 'Email', description: 'Send notifications to customers who gave an email address.' },
          { path: 'smsEnabled', type: 'toggle', label: 'SMS', description: 'Send notifications by text message. SMS gateway charges apply.' },
          { path: 'orderEvents', type: 'tags', label: 'Order events to notify', description: 'Event codes, for example order.confirmed. Press Enter after each one.', max: 100, itemMax: 100, wide: true }
        ]
      }
    ]
  },
  {
    id: 'security',
    category: 'platform',
    title: 'Accounts and security',
    description: 'Customer verification and staff sign-in requirements.',
    icon: ShieldCheck,
    cards: [
      {
        id: 'customers',
        group: 'verification',
        title: 'Customer accounts',
        description: 'Verification required before a customer account can be used.',
        fields: [
          { path: 'requirePhoneVerification', type: 'toggle', label: 'Verify phone number', description: 'Send a one-time code by SMS at sign-up.' },
          { path: 'requireEmailVerification', type: 'toggle', label: 'Verify email address', description: 'Send a confirmation link by email at sign-up.' }
        ]
      },
      {
        id: 'staff',
        group: 'verification',
        title: 'Staff security',
        description: 'Applies to everyone who signs in to this admin.',
        fields: [
          { path: 'staffMfaRequired', type: 'toggle', label: 'Require two-factor authentication', description: 'Staff must set up an authenticator app before they can use the admin.' }
        ]
      }
    ]
  },
  {
    id: 'seo',
    category: 'platform',
    title: 'SEO and analytics',
    description: 'Search engine listing, social sharing and visitor analytics.',
    icon: Globe2,
    cards: [
      {
        id: 'search',
        group: 'seo',
        title: 'Search engine listing',
        description: 'Used on pages that do not set their own title and description.',
        fields: [
          { path: 'defaultTitle', type: 'text', label: 'Default page title', max: 255, counter: 60, wide: true },
          { path: 'defaultDescription', type: 'textarea', label: 'Default meta description', max: 500, counter: 160, wide: true },
          { path: 'socialImageId', type: 'text', label: 'Social sharing image ID', description: 'Media library ID of the image shown when your store is shared.', ulid: true, nullable: true },
          { path: 'robotsIndex', type: 'toggle', label: 'Allow search engines to index the store', description: 'Turn off while you set up the store so unfinished pages stay out of Google.', wide: true }
        ]
      },
      {
        id: 'analytics',
        group: 'analytics',
        title: 'Analytics',
        description: 'Measure visits and conversions. Only public measurement IDs go here, never secrets.',
        fields: [
          {
            path: 'provider',
            type: 'choice',
            label: 'Provider',
            wide: true,
            options: [
              { value: 'none', label: 'None' },
              { value: 'ga4', label: 'Google Analytics 4' },
              { value: 'meta', label: 'Meta Pixel' }
            ]
          },
          { path: 'publicMeasurementId', type: 'text', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX', max: 100, nullable: true, hiddenWhen: { path: 'provider', equals: 'none' } },
          { path: 'consentRequired', type: 'toggle', label: 'Ask for cookie consent first', description: 'Analytics loads only after the visitor accepts.', wide: true }
        ]
      }
    ]
  },
  {
    id: 'maintenance',
    category: 'platform',
    title: 'Maintenance mode',
    description: 'Temporarily close the storefront while you make changes.',
    icon: Construction,
    cards: [
      {
        id: 'maintenance',
        group: 'maintenance',
        title: 'Maintenance mode',
        description: 'Visitors see your message instead of the store. Orders cannot be placed.',
        fields: [
          { path: 'enabled', type: 'toggle', label: 'Put the storefront in maintenance mode', tone: 'danger' },
          { path: 'message', type: 'localized', label: 'Message to visitors', textarea: true, max: 255, required: true },
          { path: 'allowAdmin', type: 'toggle', label: 'Signed-in staff can still browse the store' }
        ]
      }
    ]
  }
];

export const sectionById = (id) => SETTINGS_SECTIONS.find((section) => section.id === id);

/** Every field with its resolved group, for validation and search. */
export function sectionFields(section) {
  return section.cards.flatMap((card) => (card.fields || []).map((field) => ({ ...field, group: field.group || card.group, card })));
}

/** Backend groups a section writes to, so the save bar and nav know which sections have unsaved edits. */
export function sectionGroups(section) {
  const groups = new Set(sectionFields(section).map((field) => field.group));
  for (const card of section.cards) if (card.group) groups.add(card.group);
  return [...groups];
}

export const ESTIMATE_ZONE_LABELS = { inside_dhaka: 'Inside Dhaka', dhaka_suburb: 'Dhaka suburbs', outside_dhaka: 'Outside Dhaka' };

export function zoneLabel(code) {
  return ESTIMATE_ZONE_LABELS[code] || code.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

export const fieldDomId = (group, path) => `setting-${group}-${path.replace(/\./g, '-')}`;

export function getPath(value, path) {
  return path.split('.').reduce((result, key) => result?.[key], value);
}

export function setPath(value, path, next) {
  const result = structuredClone(value ?? {});
  const keys = path.split('.');
  let target = result;
  for (const key of keys.slice(0, -1)) {
    if (!target[key] || typeof target[key] !== 'object') target[key] = {};
    target = target[key];
  }
  target[keys.at(-1)] = next;
  return result;
}

export function isEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((item, index) => isEqual(item, b[index]));
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => isEqual(a[key], b[key]));
}

/** True when the toggle a field depends on is off; such fields are shown but locked. */
export function isFieldInactive(field, value) {
  return Boolean(field.dependsOn) && getPath(value, field.dependsOn) === false;
}

export function isFieldHidden(field, value) {
  return Boolean(field.hiddenWhen) && getPath(value, field.hiddenWhen.path) === field.hiddenWhen.equals;
}

const blank = (value) => value === null || value === undefined || String(value).trim() === '';

/**
 * Client-side check of one field. `undefined` means the group was never saved with this key, so the
 * backend default applies and nothing is required from the admin.
 */
export function validateField(field, value) {
  if (value === undefined) return null;
  const { type } = field;
  if (type === 'toggle' || type === 'logo' || type === 'choice') return null;
  if (type === 'localized') {
    for (const [locale, name] of [['en', 'English'], ['bn', 'Bangla']]) {
      const text = value?.[locale] ?? '';
      if (field.required && blank(text)) return `Enter the ${name} ${field.label.toLowerCase()}.`;
      if (field.max && text.length > field.max) return `${name} text must be ${field.max} characters or fewer.`;
    }
    return null;
  }
  if (type === 'number') {
    if (blank(value)) return 'Enter a number.';
    const number = Number(value);
    if (!Number.isInteger(number)) return 'Enter a whole number.';
    if (field.min !== undefined && number < field.min) return `Must be ${field.min} or more.`;
    if (field.max !== undefined && number > field.max) return `Must be ${field.max.toLocaleString('en-US')} or less.`;
    return null;
  }
  if (type === 'money') {
    if (blank(value)) return 'Enter an amount.';
    return MONEY.test(String(value)) ? null : 'Enter an amount like 500 or 499.50.';
  }
  if (type === 'percent') {
    if (blank(value)) return 'Enter a rate.';
    return PERCENT.test(String(value)) ? null : 'Enter a rate between 0 and 99.9999.';
  }
  if (type === 'tags' || type === 'products') {
    const items = value || [];
    if (field.max && items.length > field.max) return `Add at most ${field.max}.`;
    if (field.itemMax && items.some((item) => item.length > field.itemMax)) return `Each entry must be ${field.itemMax} characters or fewer.`;
    return null;
  }
  if (type === 'wallets') {
    const bad = (value || []).find((item) => !WALLET_NUMBER.test(String(item.number || '').replace(/[\s-]/g, '')));
    return bad ? 'Enter wallet numbers like 01XXXXXXXXX.' : null;
  }
  if (type === 'links') {
    const items = value || [];
    if (field.max && items.length > field.max) return `Add at most ${field.max} links.`;
    const index = items.findIndex((item) => blank(item.label) || !WEB_URL.test(item.url || ''));
    if (index >= 0) return `Link ${index + 1} needs a name and a web address starting with https://.`;
    return null;
  }
  const text = value ?? '';
  if (blank(text)) return field.required ? `Enter the ${field.label.toLowerCase()}.` : null;
  if (field.max && text.length > field.max) return `Must be ${field.max} characters or fewer.`;
  if (type === 'email' && !EMAIL.test(text)) return 'Enter a valid email address.';
  if (type === 'url' && !WEB_URL.test(text)) return 'Enter a web address starting with https://.';
  if (field.ulid && !ULID.test(text)) return 'Enter a 26-character media ID.';
  if (field.pattern && !field.pattern.test(text)) return field.patternMessage || 'Check the format.';
  return null;
}

/** Rules that span several fields of one group. */
const GROUP_RULES = {
  risk: (value) => {
    const medium = Number(value?.mediumScore);
    const high = Number(value?.highScore);
    if (Number.isFinite(medium) && Number.isFinite(high) && medium >= high) return { highScore: 'High risk must start above the medium risk score.' };
    return {};
  },
  delivery: (value) => {
    const errors = {};
    for (const [code, text] of Object.entries(value?.estimates || {})) {
      for (const locale of ['en', 'bn']) if ((text?.[locale] || '').length > 80) errors[`estimates.${code}`] = 'Keep each estimate to 80 characters or fewer.';
    }
    return errors;
  }
};

/** Errors keyed by field path for one group, using every section's fields that write to it. */
export function validateGroup(group, value) {
  const errors = {};
  for (const section of SETTINGS_SECTIONS) {
    for (const field of sectionFields(section)) {
      if (field.group !== group) continue;
      const message = validateField(field, getPath(value, field.path));
      if (message) errors[field.path] = message;
    }
  }
  return { ...errors, ...(GROUP_RULES[group]?.(value) || {}) };
}

/** Client check of one delivery method, mirroring methodSchema in admin-shipping.controller.ts. */
export function validateMethod(method) {
  const errors = {};
  if (!method.labelEn?.trim()) errors.labelEn = 'Enter the English label.';
  else if (method.labelEn.length > 160) errors.labelEn = 'Keep it to 160 characters or fewer.';
  if (!method.labelBn?.trim()) errors.labelBn = 'Enter the Bangla label.';
  else if (method.labelBn.length > 160) errors.labelBn = 'Keep it to 160 characters or fewer.';
  if (!MONEY.test(String(method.flatRate ?? ''))) errors.flatRate = 'Enter a rate like 80 or 79.50.';
  if (method.freeThreshold !== null && method.freeThreshold !== '' && method.freeThreshold !== undefined && !MONEY.test(String(method.freeThreshold))) errors.freeThreshold = 'Enter an amount like 2000.';
  if (!method.allowedPayments?.length) errors.allowedPayments = 'Allow at least one payment method.';
  return errors;
}

/** Folds backend fieldErrors (`name.en`, `socialLinks.0.url`) onto the field paths used here. */
export function mapServerErrors(group, fieldErrors) {
  const paths = SETTINGS_SECTIONS.flatMap(sectionFields).filter((field) => field.group === group).map((field) => field.path);
  const mapped = {};
  for (const [key, messages] of Object.entries(fieldErrors || {})) {
    const message = Array.isArray(messages) ? messages[0] : String(messages);
    const path = paths.find((candidate) => key === candidate || key.startsWith(`${candidate}.`)) || (key.startsWith('estimates.') ? key.split('.').slice(0, 2).join('.') : '_form');
    mapped[path] ||= message;
  }
  return mapped;
}

/** Flat index of fields for the settings search box. */
export function searchSettings(term) {
  const query = term.trim().toLowerCase();
  if (query.length < 2) return [];
  const results = [];
  for (const section of SETTINGS_SECTIONS) {
    for (const card of section.cards) {
      const entries = card.fields?.length ? card.fields.map((field) => ({ field, text: `${field.label} ${field.description || ''}`, label: field.label, group: field.group || card.group })) : [{ text: `${card.title} ${card.description}`, label: card.title }];
      for (const entry of entries) {
        if (!`${entry.text} ${card.title}`.toLowerCase().includes(query)) continue;
        results.push({ key: `${section.id}:${card.id}:${entry.field?.path || ''}`, section, card, label: entry.label, target: entry.field ? fieldDomId(entry.group, entry.field.path) : `card-${card.id}` });
      }
    }
  }
  return results.slice(0, 12);
}

/** One-line status per section for the settings overview. */
export function sectionSummary(sectionId, values) {
  const v = (group) => values?.[group] || {};
  const onOff = (flag) => (flag === false ? 'Off' : 'On');
  switch (sectionId) {
    case 'general': return v('store').name?.en || null;
    case 'checkout': return `Guest checkout ${onOff(v('ordering').allowGuestCheckout).toLowerCase()}`;
    case 'taxes': return v('tax').enabled ? `VAT ${v('tax').rate || 0}%` : 'VAT not charged';
    case 'confirmation': return `COD confirmation ${onOff(v('confirmation').enabled).toLowerCase()}`;
    case 'returns': return v('returns').enabled === false ? 'Returns off' : `${v('returns').windowDays ?? 7}-day returns`;
    case 'security': return v('verification').staffMfaRequired ? 'Staff 2FA required' : 'Staff 2FA optional';
    case 'maintenance': return v('maintenance').enabled ? 'Store is closed' : 'Store is open';
    default: return null;
  }
}
