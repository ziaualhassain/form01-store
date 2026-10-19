import type { HomepageSection, Product } from "./api";

const aliases: Record<string, string[]> = {
  Hoodies: ["HOODIE", "HOODIES", "OVERSIZED-HOODIE"],
  Sweatshirts: ["SWEATSHIRT", "SWEATSHIRTS", "OVERSIZED-SWEATSHIRT"],
  Tees: ["TEE", "TEES", "T-SHIRT", "TSHIRT", "SHIRT", "OVERSIZED-SHIRT"],
  Caps: ["CAP", "CAPS"],
  Accessories: ["ACCESSORY", "ACCESSORIES", "TUMBLER", "BOTTLE", "BAG"],
  Books: ["BOOK", "BOOKS", "NOTEBOOK"],
  Essentials: ["ESSENTIAL", "ESSENTIALS"],
};

export function categoryForType(value?: string | null) {
  const type = value?.trim().toUpperCase().replaceAll("_", "-").replaceAll(" ", "-") || "";
  return Object.keys(aliases).find((label) => aliases[label].includes(type)) || type;
}

const asset = (value: unknown) => typeof value === "string" && (value.startsWith("https://") || (value.startsWith("/") && !value.startsWith("//"))) ? value : "";

export function catalogueCategories(products: Product[], sections: HomepageSection[] = []) {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const key = categoryForType(product.product_type);
    if (product.status !== "ACTIVE" || !key) continue;
    groups.set(key, [...(groups.get(key) || []), product]);
  }
  const settings = sections.slice().sort((a, b) => a.position - b.position)
    .filter((section) => section.type === "category_grid")
    .flatMap((section) => Array.isArray(section.content.items) ? section.content.items : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  return Array.from(groups, ([key, items]) => {
    const config = settings.find((item) => typeof item.product_type === "string" && categoryForType(item.product_type) === key);
    const image = config?.image && typeof config.image === "object" && !Array.isArray(config.image) ? config.image as Record<string, unknown> : {};
    const productImage = items.flatMap((product) => [product.image_url, ...(product.image_urls || [])]).find((url) => asset(url));
    return { key, type: key, title: key === key.toUpperCase() ? key.toLowerCase().replaceAll("-", " ") : key, image: asset(image.desktop_url) || asset(productImage), mobile: asset(image.mobile_url), alt: typeof image.alt === "string" ? image.alt : key };
  });
}
