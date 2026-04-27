// Export current CSV products to products.json
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const mainCsv = parse(fs.readFileSync('products_export_1.csv', 'utf8'), { columns: true, skip_empty_lines: true, relax_column_count: true });
const dealerCsv = parse(fs.readFileSync('dealer supplies.csv', 'utf8'), { columns: true, skip_empty_lines: true, relax_column_count: true });

function extractProducts(rows, defaultCollection) {
  const products = {};
  for (const row of rows) {
    const handle = row.Handle;
    if (!handle) continue;
    if (!products[handle]) {
      products[handle] = {
        handle,
        title: row.Title || '',
        body: row['Body (HTML)'] || '',
        vendor: row.Vendor || '',
        type: row.Type || '',
        tags: row.Tags || '',
        images: [],
        price: row['Variant Price'] || '0.00',
        collections: [],
        defaultCollection: defaultCollection || null
      };
    }
    const imgSrc = row['Image Src'];
    if (imgSrc && !products[handle].images.includes(imgSrc)) {
      products[handle].images.push(imgSrc);
    }
    if (!products[handle].title && row.Title) products[handle].title = row.Title;
  }
  return Object.values(products).filter(p => p.title);
}

const all = [...extractProducts(mainCsv, null), ...extractProducts(dealerCsv, 'dealer-supplies')];

// Give each product a unique ID
all.forEach((p, i) => {
  p.id = p.handle || 'product-' + i;
});

fs.writeFileSync('products.json', JSON.stringify(all, null, 2));
console.log(`Exported ${all.length} products to products.json`);
