// All the text on the first page lives here, so it's easy to change.
// (Colour classes are written out in full so Tailwind can find them.)

// ✓ points in the hero (top of the page)
export const HERO_POINTS = [
  'See your monthly bills and paid / unpaid status any time',
  'Report outages and track every complaint until it is solved',
  'Admins manage customers, meters, readings and reports',
];

// Small numbers strip under the hero points
export const STATS = [
  { value: '15', label: 'Core features' },
  { value: '2', label: 'Login roles' },
  { value: '7', label: 'Request types' },
  { value: '24/7', label: 'Online access' },
];

// Vision section
export const VISION = [
  {
    icon: 'target',
    title: 'Our Vision',
    text: 'Reliable power for every home and business, with bills that people can understand and trust.',
    tone: 'from-ember to-flame',
  },
  {
    icon: 'bolt',
    title: 'Our Mission',
    text: 'Replace paper registers with one simple online system for customers, meters, bills and complaints.',
    tone: 'from-fuchsia-600 to-pink-600',
  },
  {
    icon: 'shield',
    title: 'Our Promise',
    text: 'Clear and safe: every bill shows its slabs and tax, every request shows its status, every role sees only its own pages.',
    tone: 'from-sky-600 to-indigo-600',
  },
];

// Category chips for the search area (like the reference sites)
export const CATEGORIES = ['All', 'Customers', 'Meters', 'Billing', 'Payments', 'Support', 'Reports', 'Security'];

// Overview / services cards (the search and chips filter these)
export const SERVICES = [
  {
    title: 'Customer Profiles',
    category: 'Customers',
    icon: 'users',
    text: 'Every customer with contact details, type (Residential or Commercial) and status in one place.',
    tone: 'from-sky-600 to-blue-600',
  },
  {
    title: 'Connections & Meters',
    category: 'Meters',
    icon: 'plug',
    text: 'Each electricity connection has its own meter number, phase type and full history.',
    tone: 'from-violet-600 to-indigo-600',
  },
  {
    title: 'Meter Readings',
    category: 'Meters',
    icon: 'gauge',
    text: 'Monthly readings are checked, so a new reading can never be lower than the last one.',
    tone: 'from-teal-600 to-emerald-600',
  },
  {
    title: 'Slab-Based Bills',
    category: 'Billing',
    icon: 'receipt',
    text: 'Bills are calculated from tariff slabs, with tax and due dates added automatically.',
    tone: 'from-ember to-flame',
  },
  {
    title: 'Paid / Unpaid Tracking',
    category: 'Payments',
    icon: 'wallet',
    text: 'A payment updates the bill straight away: Unpaid, Partially Paid, Paid or Overdue.',
    tone: 'from-emerald-600 to-green-600',
  },
  {
    title: 'Requests & Complaints',
    category: 'Support',
    icon: 'complaint',
    text: 'Customers report outages or meter problems and follow each request until it is resolved.',
    tone: 'from-rose-600 to-pink-600',
  },
  {
    title: 'Reports & Dashboard',
    category: 'Reports',
    icon: 'chart',
    text: 'Charts for revenue, collections and open requests show the admin team the whole picture.',
    tone: 'from-fuchsia-600 to-purple-600',
  },
  {
    title: 'Role Based Login',
    category: 'Security',
    icon: 'key',
    text: 'Admins and customers log in from their own tab and only see the pages made for their role.',
    tone: 'from-sand-500 to-sand-800',
  },
];

// "How it works" steps for a new customer
export const STEPS = [
  { icon: 'user', title: 'Sign up', text: 'Create your customer account in a minute. No paperwork.' },
  { icon: 'plug', title: 'Get connected', text: 'Our team links your electricity connection and meter to your account.' },
  { icon: 'receipt', title: 'Track & pay', text: 'See monthly bills, check paid / unpaid status and raise requests online.' },
];

// FAQ (each one opens like a dropdown)
export const FAQS = [
  {
    q: 'Who can sign up?',
    a: 'Only customers. Admin (staff) accounts are created by the system administrator, so there is no sign up on the Admin tab.',
  },
  {
    q: 'Why is there a Customer / Admin switch?',
    a: 'It is a Role Based Login. Each account can only log in from its own tab, and then it opens its own dashboard.',
  },
  {
    q: 'How is my bill calculated?',
    a: 'From your meter readings, using tariff slabs (the more units you use, the higher the slab rate) plus tax.',
  },
  {
    q: 'I signed up but I see no bills yet. Why?',
    a: 'That is normal. Bills appear after an admin links your meter and enters your first reading.',
  },
  {
    q: 'How do I report a power outage?',
    a: 'Log in, open Requests, press New request and choose "Power Outage". You can follow its status there.',
  },
];

// Navbar "Help" dropdown
export const HELP_LINKS = [
  { href: '#estimator', icon: 'calculator', title: 'Bill estimator', text: 'See what your bill will be' },
  { href: '#how', icon: 'activity', title: 'How it works', text: 'Three simple steps' },
  { href: '#faq', icon: 'info', title: 'FAQ', text: 'Quick answers' },
  { href: '#feedback', icon: 'send', title: 'Give feedback', text: 'Tell us how to improve' },
  { href: '#contact', icon: 'mail', title: 'Contact us', text: 'Phone, email and address' },
];

// Footer contact details - change these to your team's real details
export const CONTACT = {
  email: 'pums.admins@gmail.com', // the team's real inbox (chosen by the team, 18 Nov 2026)
  phone: '+880 1303-437131',
  address: 'Dhaka, Bangladesh',
};

// Social media icons in the footer - replace '#' with your real page links
export const SOCIALS = [
  { icon: 'facebook', label: 'Facebook', href: '#' },
  { icon: 'instagram', label: 'Instagram', href: '#' },
  { icon: 'linkedin', label: 'LinkedIn', href: '#' },
  { icon: 'youtube', label: 'YouTube', href: '#' },
  { icon: 'github', label: 'GitHub', href: 'https://github.com/sudipto57/power-utility-management-system' },
];
