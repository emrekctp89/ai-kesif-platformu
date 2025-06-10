// src/components/SubmitForm.js

"use client"; // Bu bir client component'idir çünkü kullanıcı etkileşimi ve state içerir.

import { submitTool } from "@/app/actions";

export default function SubmitForm({ categories }) {
  return (
    // Server Action'ı form etiketine ekliyoruz
    <form action={submitTool} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Araç Adı *
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="link" className="block text-sm font-medium text-gray-700">
          Web Sitesi Linki *
        </label>
        <input
          type="url"
          name="link"
          id="link"
          required
          placeholder="https://example.com"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Açıklama
        </label>
        <textarea
          name="description"
          id="description"
          rows="3"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        ></textarea>
      </div>
      <div>
        <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
          Kategori *
        </label>
        <select
          name="category_id"
          id="category_id"
          required
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="">Bir kategori seçin...</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Gönder
        </button>
      </div>
    </form>
  );
}