'use client';

import {useMemo, useState} from 'react';
import {ProductArt} from '@/components/site';
import type {Product} from '@/lib/data';

export function ProductGallery({product}: {product: Product}) {
  const images = useMemo(
    () => [...new Set([product.coverUrl, ...(product.previewUrls || [])].filter((value): value is string => Boolean(value)))],
    [product.coverUrl, product.previewUrls],
  );
  const [activeImage, setActiveImage] = useState(images[0] || '');

  return (
    <div className="product-gallery">
      <div className="product-feature-image">
        {activeImage ? <img src={activeImage} alt={`${product.title} preview`} /> : <ProductArt p={product} large />}
      </div>
      {images.length > 1 && (
        <div className="product-real-thumbnails" aria-label={`${product.title} previews`}>
          {images.map((image, index) => (
            <button
              className={image === activeImage ? 'active' : ''}
              type="button"
              key={image}
              onClick={() => setActiveImage(image)}
              aria-label={`Show preview ${index + 1}`}
              aria-pressed={image === activeImage}
            >
              <img src={image} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
