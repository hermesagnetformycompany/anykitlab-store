'use client';

import {FormEvent, useCallback, useMemo, useState} from 'react';
import {Check, ImageIcon, LayoutTemplate, Pencil, RefreshCw, Trash2, X} from 'lucide-react';

type ProductRow = {id: string; slug: string; title: string; status: 'Published' | 'Draft' | 'Archived'; category_id: string; collection_id: string | null; cover_url: string};
type CategoryRow = {id: string; slug: string; name: string; description: string; status: 'Active' | 'Hidden'};
type CollectionRow = {id