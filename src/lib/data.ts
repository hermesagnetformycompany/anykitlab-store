export type Category={id:string;slug:string;name:string;description:string;status:'Active'|'Hidden';productCount:number};
export type Collection={id:string;name:string;description:string;status:'Published'|'Draft';categoryIds:string[]};
export type MediaAsset={id:string;name:string;type:'Cover'|'Preview'|'Video'|'Delivery';productSlug?:string;status:'Ready'|'Processing';storagePath?:string;publicUrl?:string};
export type Product={id:string;slug:string;title:string;categoryId:string;category:string;collectionId:string;price:number;mrp:number;layoutCount:number;count:string;description:string;long:string;accent:string;dark:string;badge:string;status:'Published'|'Draft'|'Archived';formats:string[];includes:string[];updatedAt:string;coverUrl?:string;previewUrl?:string;previewUrls?:string[]};

export const categories:Category[]=[];

export const collections:Collection[]=[];

export const products:Product[]=[];

export const mediaAssets:MediaAsset[]=[];

export const money=(n:number)=>`₹${n.toLocaleString('en-IN')}`;
export const productBySlug=(slug:string)=>products.find(p=>p.slug===slug);
export const categoryById=(id:string)=>categories.find(c=>c.id===id);
