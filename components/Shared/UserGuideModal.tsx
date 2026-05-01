import React, { useEffect, useMemo, useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, Package, Wrench, Users, Boxes,
  ShoppingCart, BookOpen, Sparkles, CheckCircle2, Settings as SettingsIcon,
} from 'lucide-react';

interface UserGuideStep {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  body: React.ReactNode;
}

interface UserGuideModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, "Don't show again" is keyed per-user */
  userId?: string | null;
}

/**
 * On-boarding User Guide shown to new users (no products + no sales) on login.
 * Walks through creating products, services, employee accounts, stocking,
 * and using the POS interface. Persists "don't show again" per user in
 * localStorage.
 */
const UserGuideModal: React.FC<UserGuideModalProps> = ({ open, onClose, userId }) => {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const steps = useMemo<UserGuideStep[]>(() => [
    {
      title: 'Welcome to your dashboard',
      icon: Sparkles,
      body: (
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Glad to have you here! This quick tour shows you the essentials to
            get your business up and running in just a few minutes.
          </p>
          <p>You'll learn how to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Customize your <strong>company details</strong> so invoices &amp; receipts carry your identity.</li>
            <li>Create your first <strong>product</strong> and <strong>service</strong>.</li>
            <li>Add <strong>employee accounts</strong> with the right roles.</li>
            <li>Stock products and move inventory between locations.</li>
            <li>Use the <strong>POS interface</strong> to record your first sale.</li>
          </ul>
          <p className="text-xs text-slate-500">You can re-open this guide any time from the dashboard.</p>
        </div>
      ),
    },
    {
      title: 'Customize your company details',
      icon: SettingsIcon,
      body: (
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            Before you start selling, head to <strong>App Settings</strong> and
            personalize your business profile so every invoice and receipt
            you issue bears <em>your</em> identity — not the defaults.
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open <strong>Settings</strong> from the sidebar.</li>
            <li>Upload your <strong>logo</strong> (and optional header / footer images).</li>
            <li>Fill in your <strong>company name, address, phone and email</strong>.</li>
            <li>Add your <strong>bank account number</strong> and other payment details.</li>
            <li>Set your <strong>currency</strong>, <strong>VAT rate</strong> and invoice notes.</li>
            <li>Click <strong>Save</strong> — your branding now appears on every invoice and receipt.</li>
          </ol>
          <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded p-2">
            <strong>Tip:</strong> Customers trust branded documents more. Taking 2 minutes here
            makes your business look professional from day one.
          </p>
        </div>
      ),
    },
    {
      title: 'Create products',
      icon: Package,
      body: (
        <div className="space-y-2 text-sm text-slate-600">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open <strong>Inventory</strong> from the sidebar.</li>
            <li>Click <strong>+ New Product</strong>.</li>
            <li>Fill in name, price, unit and category, then upload an image (optional).</li>
            <li>Hit <strong>Save</strong> — your product is now available in the POS.</li>
          </ol>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
            <strong>Heads up:</strong> Unactivated accounts can publish a limited number of products.
            Activate your account to lift the cap.
          </p>
        </div>
      ),
    },
    {
      title: 'Create services',
      icon: Wrench,
      body: (
        <div className="space-y-2 text-sm text-slate-600">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open <strong>Services</strong> from the sidebar.</li>
            <li>Click <strong>+ New Service</strong>.</li>
            <li>Enter name, rate / price, unit (e.g. <em>hr</em>, <em>session</em>) and category.</li>
            <li>Save — services are billable directly from the POS.</li>
          </ol>
          <p className="text-xs text-slate-500">
            Services don't require stock, so they're a great way to start
            earning if you offer time- or session-based work.
          </p>
        </div>
      ),
    },
    {
      title: 'Add employee accounts',
      icon: Users,
      body: (
        <div className="space-y-2 text-sm text-slate-600">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to <strong>Admin → Employees</strong>.</li>
            <li>Click <strong>+ Add Employee</strong>.</li>
            <li>Enter their name, email, and assign a <strong>Role</strong> (e.g. Cashier, Manager).</li>
            <li>They'll receive an email to set their password.</li>
          </ol>
          <p className="text-xs text-slate-500">
            Roles control what each user can do. Adjust permissions under
            <strong> Admin → Roles</strong> at any time.
          </p>
        </div>
      ),
    },
    {
      title: 'Stock your products',
      icon: Boxes,
      body: (
        <div className="space-y-2 text-sm text-slate-600">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open <strong>Stock</strong> from the sidebar.</li>
            <li>Pick a product and click <strong>Increase</strong> to add inventory.</li>
            <li>Specify quantity, location, supplier and (optionally) batch number.</li>
            <li>Use <strong>Move</strong> to transfer stock between locations.</li>
          </ol>
          <p className="text-xs text-slate-500">
            Every stock change is logged so you can review history later from
            the same screen.
          </p>
        </div>
      ),
    },
    {
      title: 'Make your first sale (POS)',
      icon: ShoppingCart,
      body: (
        <div className="space-y-2 text-sm text-slate-600">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Open <strong>POS</strong> from the sidebar.</li>
            <li>Tap a product or service to add it to the cart, or scan its barcode.</li>
            <li>Adjust quantities, choose a customer (optional) and a payment method.</li>
            <li>Click <strong>Charge</strong> — a receipt is generated automatically.</li>
          </ol>
          <p className="text-xs text-slate-500">
            All sales appear under <strong>Sales History</strong>, and totals
            update on your dashboard in real time.
          </p>
        </div>
      ),
    },
    {
      title: "You're all set",
      icon: CheckCircle2,
      body: (
        <div className="space-y-3 text-sm text-slate-600">
          <p>That's the core flow! As you grow, explore:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Customers</strong> &amp; <strong>Suppliers</strong> — keep your contacts organised.</li>
            <li><strong>Finance</strong> &amp; <strong>Reports</strong> — track revenue, expenses and trends.</li>
            <li><strong>Settings</strong> — branding, tax, currency and printing preferences.</li>
          </ul>
          <p className="text-xs text-slate-500">
            Need help? Use the in-app feedback form to reach the team.
          </p>
        </div>
      ),
    },
  ], []);

  // Reset to first step every time the modal opens
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const isLast = step === steps.length - 1;
  const StepIcon = steps[step].icon;

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        const key = userId ? `omnisales_user_guide_dismissed_${userId}` : 'omnisales_user_guide_dismissed';
        localStorage.setItem(key, '1');
      } catch (e) { /* ignore */ }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="user-guide-title">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={20} />
            <h2 id="user-guide-title" className="font-bold">New User Guide</h2>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white" aria-label="Close guide">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center gap-1.5 mb-4" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-indigo-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <StepIcon size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{steps[step].title}</h3>
          </div>
        </div>

        <div className="px-6 pb-4 max-h-[60vh] overflow-y-auto">
          {steps[step].body}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              className="rounded"
            />
            Don't show this guide again
          </label>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-3 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Back
            </button>
            {isLast ? (
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
              >
                Get started <CheckCircle2 size={16} />
              </button>
            ) : (
              <button
                onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
              >
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuideModal;
