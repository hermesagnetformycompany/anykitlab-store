export type Category={id:string;slug:string;name:string;description:string;status:'Active'|'Hidden';productCount:number};
export type Collection={id:string;name:string;description:string;status:'Published'|'Draft';categoryIds:string[]};
export type MediaAsset={id:string;name:string;type:'Cover'|'Preview'|'Video'|'Delivery';productSlug?:string;status:'Ready'|'Processing'};
export type Product={id:string;slug:string;title:string;categoryId:string;category:string;collectionId:string;price:number;mrp:number;layoutCount:number;count:string;description:string;long:string;accent:string;dark:string;badge:string;status:'Published'|'Draft'|'Archived';formats:string[];includes:string[];updatedAt:string;coverUrl?:string;previewUrl?:string};

export const categories:Category[]=[
{id:'cat-fitness',slug:'fitness',name:'Fitness & Wellness',description:'For gyms, coaches, trainers and wellness brands.',status:'Active',productCount:1},
{id:'cat-beauty',slug:'beauty',name:'Beauty & Service',description:'For beauty professionals, studios and appointment-led businesses.',status:'Active',productCount:1},
{id:'cat-auto',slug:'automotive',name:'Auto Detailing',description:'For detailing studios, garages and automotive specialists.',status:'Active',productCount:1},
{id:'cat-food',slug:'food',name:'Food & Hospitality',description:'For cafés, restaurants and food-led brands.',status:'Active',productCount:1},
{id:'cat-realestate',slug:'real-estate',name:'Real Estate',description:'For agents, brokers and property businesses.',status:'Active',productCount:1},
{id:'cat-coaching',slug:'coaching',name:'Coaches & Consultants',description:'For coaches, consultants and service-led experts.',status:'Active',productCount:1}
];

export const collections:Collection[]=[
{id:'col-social',name:'Instagram Growth Kits',description:'Complete feed, carousel and story systems.',status:'Published',categoryIds:['cat-fitness','cat-beauty','cat-auto']},
{id:'col-launch',name:'Launch & Offer Kits',description:'Campaign-oriented layouts for new services and offers.',status:'Draft',categoryIds:['cat-fitness','cat-beauty']}
];

export const products:Product[]=[
{id:'tpl-001',slug:'gym-fitness-instagram-templates',title:'Gym & Fitness Instagram Templates',categoryId:'cat-fitness',category:'Fitness & Wellness',collectionId:'col-social',price:799,mrp:1499,layoutCount:100,count:'100+ layouts',description:'High-energy posts, stories and carousels for trainers and gyms.',long:'A complete social kit designed to make fitness brands look focused, credible and ready to move. Every layout is fully editable in Canva.',accent:'#b8ff64',dark:'#111712',badge:'BESTSELLER',status:'Published',formats:['Square posts','Stories','Carousels','Offer slides'],includes:['60 feed posts','24 story layouts','16 carousel slides','Caption prompt sheet'],updatedAt:'10 Jul 2026'},
{id:'tpl-002',slug:'lash-tech-instagram-templates',title:'Lash Tech Instagram Templates',categoryId:'cat-beauty',category:'Beauty & Service',collectionId:'col-social',price:699,mrp:1299,layoutCount:80,count:'80+ layouts',description:'Polished booking, aftercare and offer graphics for lash artists.',long:'A refined content system for independent lash artists and beauty studios. Swap your colours, imagery and copy with no design experience required.',accent:'#f4b9d1',dark:'#291a24',badge:'NEW',status:'Published',formats:['Square posts','Stories','Price cards','Highlight covers'],includes:['48 feed posts','20 story layouts','12 price & policy cards','Highlight cover set'],updatedAt:'08 Jul 2026'},
{id:'tpl-003',slug:'the-detail-authority',title:'The Detail Authority Canva Kit',categoryId:'cat-auto',category:'Auto Detailing',collectionId:'col-social',price:699,mrp:1599,layoutCount:70,count:'70+ layouts',description:'Premium visual content built for serious detailing studios.',long:'Turn meticulous craft into a premium presence. This bold kit gives detailing studios a confident, consistent look across every campaign.',accent:'#81b7ff',dark:'#101820',badge:'PRO KIT',status:'Published',formats:['Square posts','Stories','Service menus','Before/after'],includes:['40 feed posts','18 story layouts','8 service menus','4 before/after frames'],updatedAt:'05 Jul 2026'},
{id:'tpl-004',slug:'real-estate-social-media-kit',title:'Real Estate Social Media Kit',categoryId:'cat-realestate',category:'Real Estate',collectionId:'col-social',price:699,mrp:1299,layoutCount:80,count:'80+ layouts',description:'Property posts, listings and launch graphics for real estate professionals.',long:'A complete Canva content kit for agents, brokers and property teams who need polished listings and consistent social media.',accent:'#8aa3b0',dark:'#15252d',badge:'POPULAR',status:'Published',formats:['Property posts','Stories','Listing cards','Agent profiles'],includes:['48 feed posts','20 story layouts','8 listing cards','4 agent profiles'],updatedAt:'12 Jul 2026'},
{id:'tpl-005',slug:'food-restaurant-social-media-kit',title:'Food & Restaurant Social Media Kit',categoryId:'cat-food',category:'Food & Hospitality',collectionId:'col-social',price:499,mrp:999,layoutCount:90,count:'90+ layouts',description:'Menus, offers and food-first social templates for hospitality brands.',long:'A warm and appetising Canva system for cafés, restaurants and food businesses that want a consistent feed.',accent:'#e6a84a',dark:'#2d2117',badge:'NEW',status:'Published',formats:['Food posts','Stories','Menu cards','Offer layouts'],includes:['52 feed posts','24 story layouts','8 menu cards','6 offer layouts'],updatedAt:'12 Jul 2026'},
{id:'tpl-006',slug:'coaches-consultants-business-kit',title:'Coaches & Consultants Business Kit',categoryId:'cat-coaching',category:'Coaches & Consultants',collectionId:'col-launch',price:699,mrp:1299,layoutCount:90,count:'90+ layouts',description:'Authority-building posts, offers and lead magnets for service experts.',long:'A focused Canva content system for coaches and consultants who want to explain their value and launch offers clearly.',accent:'#c98c5c',dark:'#181716',badge:'STARTER',status:'Published',formats:['Authority posts','Stories','Offer cards','Lead magnets'],includes:['54 feed posts','20 story layouts','10 offer cards','6 lead magnet covers'],updatedAt:'12 Jul 2026'} as Product
];

export const mediaAssets:MediaAsset[]=[
{id:'med-001',name:'fitness-cover.webp',type:'Cover',productSlug:'gym-fitness-instagram-templates',status:'Ready'},
{id:'med-002',name:'fitness-feed-preview.webp',type:'Preview',productSlug:'gym-fitness-instagram-templates',status:'Ready'},
{id:'med-003',name:'lash-cover.webp',type:'Cover',productSlug:'lash-tech-instagram-templates',status:'Ready'},
{id:'med-004',name:'detail-authority-cover.webp',type:'Cover',productSlug:'the-detail-authority',status:'Ready'},
{id:'med-005',name:'fitness-delivery.zip',type:'Delivery',productSlug:'gym-fitness-instagram-templates',status:'Ready'}
];

export const money=(n:number)=>`₹${n.toLocaleString('en-IN')}`;
export const productBySlug=(slug:string)=>products.find(p=>p.slug===slug);
export const categoryById=(id:string)=>categories.find(c=>c.id===id);
