'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetcher } from '../../lib/api';

interface MarketingList {
  id: number;
  name: string;
  description: string;
  created_at: string;
  subscribers?: number[];
  subscriber_count?: number;
}

interface Subscriber {
  id: number;
  email: string;
  name: string;
  tags: string;
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
}

interface Campaign {
  id: number;
  subject: string;
  template_type: string;
  created_at: string;
  sent_at: string | null;
  is_sent: boolean;
  marketing_list_detail?: { id: number; name: string } | null;
}

interface MarketingManagerProps {
  primaryColor?: string;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function MarketingManager({ primaryColor = '#C68A1E', showToast }: MarketingManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'lists' | 'subscribers'>('campaigns');
  
  // Data States
  const [lists, setLists] = useState<MarketingList[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Modals & Forms
  const [showListModal, setShowListModal] = useState(false);
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [editingListId, setEditingListId] = useState<number | null>(null);

  const [showSubModal, setShowSubModal] = useState(false);
  const [subEmail, setSubEmail] = useState('');
  const [subName, setSubName] = useState('');
  const [subTags, setSubTags] = useState('');
  const [subIsPremium, setSubIsPremium] = useState(false);
  const [subListId, setSubListId] = useState<number | null>(null);
  const [editingSubId, setEditingSubId] = useState<number | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importListId, setImportListId] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Campaigner States
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignContent, setCampaignContent] = useState('');
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>(''); // empty means platform wide

  // Advanced campaigner styles
  const [templateType, setTemplateType] = useState('minimalist');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgOpacity, setBgOpacity] = useState('1.0');
  const [bgSaturation, setBgSaturation] = useState('100');
  const [bgPosition, setBgPosition] = useState('center');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [fontFamily, setFontFamily] = useState('serif');
  const [titleFontFamily, setTitleFontFamily] = useState('serif');
  const [footerFontFamily, setFooterFontFamily] = useState('serif');
  const [emailTitle, setEmailTitle] = useState('');
  const [footerText, setFooterText] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Viewport & Settings Tabs
  const [templateImages, setTemplateImages] = useState<any[]>([]);
  const [libraryUploadLoading, setLibraryUploadLoading] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'content' | 'theme' | 'cover' | 'sections' | 'ctas' | 'library'>('content');
  const [editorActiveTab, setEditorActiveTab] = useState<'title' | 'body' | 'footer'>('body');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [emojiPopoverTarget, setEmojiPopoverTarget] = useState<'subject' | 'editor' | null>(null);

  // Section Styles
  const [campTitleTextColor, setCampTitleTextColor] = useState('#ffffff');
  const [campTitleBgColor, setCampTitleBgColor] = useState('transparent');
  const [campTitlePadding, setCampTitlePadding] = useState('0px');
  const [campTitleRadius, setCampTitleRadius] = useState('0px');
  const [campBodyTextColor, setCampBodyTextColor] = useState('');
  const [campBodyBgColor, setCampBodyBgColor] = useState('transparent');
  const [campBodyPadding, setCampBodyPadding] = useState('0px');
  const [campBodyRadius, setCampBodyRadius] = useState('0px');
  const [campBodyAlignment, setCampBodyAlignment] = useState('center');
  const [campFooterTextColor, setCampFooterTextColor] = useState('');
  const [campFooterBgColor, setCampFooterBgColor] = useState('transparent');
  const [campFooterPadding, setCampFooterPadding] = useState('0px');
  const [campFooterRadius, setCampFooterRadius] = useState('0px');

  // Spacing & Widths
  const [campCardMaxWidthDesktop, setCampCardMaxWidthDesktop] = useState('680px');
  const [campCardPaddingDesktop, setCampCardPaddingDesktop] = useState('40px');
  const [campCardPaddingTablet, setCampCardPaddingTablet] = useState('40px');
  const [campCardPaddingMobile, setCampCardPaddingMobile] = useState('16px');
  const [campTitleFontSizeDesktop, setCampTitleFontSizeDesktop] = useState('26px');
  const [campTitleFontSizeTablet, setCampTitleFontSizeTablet] = useState('22px');
  const [campTitleFontSizeMobile, setCampTitleFontSizeMobile] = useState('18px');
  const [campBodyFontSizeDesktop, setCampBodyFontSizeDesktop] = useState('16px');
  const [campBodyFontSizeTablet, setCampBodyFontSizeTablet] = useState('15px');
  const [campBodyFontSizeMobile, setCampBodyFontSizeMobile] = useState('14px');
  const [campBodyAlignmentTablet, setCampBodyAlignmentTablet] = useState('center');
  const [campBodyAlignmentMobile, setCampBodyAlignmentMobile] = useState('center');

  // Image & CTA alignment
  const [campImageWidth, setCampImageWidth] = useState('100%');
  const [campImageAlign, setCampImageAlign] = useState('center');
  const [campImageRadius, setCampImageRadius] = useState('20px');
  const [campImageWidthTablet, setCampImageWidthTablet] = useState('100%');
  const [campImageWidthMobile, setCampImageWidthMobile] = useState('100%');
  const [campImageAlignTablet, setCampImageAlignTablet] = useState('center');
  const [campImageAlignMobile, setCampImageAlignMobile] = useState('center');
  const [campCtaAlignment, setCampCtaAlignment] = useState('center');
  const [campCtaAlignTablet, setCampCtaAlignTablet] = useState('center');
  const [campCtaAlignMobile, setCampCtaAlignMobile] = useState('center');
  const [campCtaMarginTop, setCampCtaMarginTop] = useState('35px');
  const [campCtaMarginBottom, setCampCtaMarginBottom] = useState('25px');
  const [campTextMode, setCampTextMode] = useState<'poem' | 'letter'>('letter');

  const campaignEditorRef = useRef<HTMLDivElement>(null);
  const isDraftPending = useRef(false);

  // Emojis Curados
  const CURATED_EMOJIS = [
    '😊', '😂', '🤣', '🥰', '😍', '😘', '😜', '🤔', '🙄', '😬', '😭', '😱', '🤫', '😴', '🤯', '🥳', '😇', '🤠', '🤡',
    '❤️', '💖', '💗', '💓', '💞', '💕', '💘', '💔', '⭐', '🌟', '✨', '⚡', '🔥', '💥', '🌈', '🌊', '❄️', '🌀',
    '🌹', '🌸', '🍃', '🍂', '🍁', '🍄', '🌵', '🌴', '🍷', '🕯️', '🎭', '🎨', '🎤', '🎧', '🎸', '🎹',
    '🔮', '📜', '✍️', '✒️', '📖', '🎟️', '🛎️', '🗝️', '🔒', '🔓', '🖤', '👑', '💎', '🏆', '🎁', '🎈', '🎉', '🎊'
  ];

  // Fetch initial data
  const loadMarketingData = async () => {
    setLoadingData(true);
    try {
      const [listsData, subsData, campaignsData] = await Promise.all([
        fetcher('/newsletter/lists/?tenant_id=null'),
        fetcher('/newsletter/subscribers/?tenant_id=null'),
        fetcher('/newsletter/campaigns/?tenant_id=null')
      ]);
      setLists(listsData.results || listsData || []);
      setSubscribers(subsData.results || subsData || []);
      setCampaigns(campaignsData.results || campaignsData || []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar datos de marketing.', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadMarketingData();
  }, []);

  // Image Library loading
  const fetchTemplateImages = async () => {
    try {
      const imagesData = await fetcher('/newsletter/template-images/?tenant_id=null');
      setTemplateImages(imagesData.results || imagesData || []);
    } catch (err) {
      console.error('Error loading template images:', err);
    }
  };

  useEffect(() => {
    if (showCampaignModal) {
      fetchTemplateImages();
    }
  }, [showCampaignModal]);

  // Image library uploads
  const handleTemplateImageUpload = async (file: File) => {
    if (!file) return;
    setLibraryUploadLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('tenant_id', 'null');
    try {
      await fetcher('/newsletter/template-images/', {
        method: 'POST',
        body: formData,
      });
      await fetchTemplateImages();
      showToast('Imagen subida con éxito.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al subir la imagen.', 'error');
    } finally {
      setLibraryUploadLoading(false);
    }
  };

  const handleTemplateImageDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta imagen de la biblioteca?')) return;
    try {
      await fetcher(`/newsletter/template-images/${id}/`, {
        method: 'DELETE',
      });
      await fetchTemplateImages();
      showToast('Imagen eliminada de la biblioteca.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar la imagen.', 'error');
    }
  };

  // Helper functions for rich editor
  const insertEmojiToSubject = (emoji: string) => {
    const input = document.getElementById('camp-subject-input') as HTMLInputElement;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = campaignSubject;
      const newValue = text.substring(0, start) + emoji + text.substring(end);
      setCampaignSubject(newValue);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 10);
    } else {
      setCampaignSubject(campaignSubject + emoji);
    }
  };

  const syncEditorState = () => {
    if (campaignEditorRef.current) {
      const html = campaignEditorRef.current.innerHTML;
      if (editorActiveTab === 'body') setCampaignContent(html);
      else if (editorActiveTab === 'title') setEmailTitle(html);
      else if (editorActiveTab === 'footer') setFooterText(html);
    }
  };

  const insertEmojiToEditor = (emoji: string) => {
    if (campaignEditorRef.current) {
      campaignEditorRef.current.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(emoji);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        campaignEditorRef.current.innerHTML += emoji;
      }
      const html = campaignEditorRef.current.innerHTML;
      if (editorActiveTab === 'body') setCampaignContent(html);
      else if (editorActiveTab === 'title') setEmailTitle(html);
      else if (editorActiveTab === 'footer') setFooterText(html);
    }
  };

  const executeCommand = (command: string, value: string = '') => {
    if (typeof document !== 'undefined') {
      document.execCommand(command, false, value);
      campaignEditorRef.current?.focus();
      if (campaignEditorRef.current) {
        const html = campaignEditorRef.current.innerHTML;
        if (editorActiveTab === 'body') setCampaignContent(html);
        else if (editorActiveTab === 'title') setEmailTitle(html);
        else if (editorActiveTab === 'footer') setFooterText(html);
      }
    }
  };

  const handleLinkInsert = () => {
    const url = prompt('Ingresa la URL del enlace:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const handleImageInsert = () => {
    const url = prompt('Ingresa la URL de la imagen:');
    if (url) {
      insertImageAtCursor(url);
    }
  };

  const insertImageAtCursor = (imgUrl: string) => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const imgHtml = `<img src="${imgUrl}" style="max-width:100%; height:auto; border-radius:12px; margin:15px auto; display:block; border:1px solid rgba(255,255,255,0.05);" />`;

      if (settingsTab === 'content' && editorActiveTab === 'body' && campaignEditorRef.current) {
        campaignEditorRef.current.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (campaignEditorRef.current.contains(range.commonAncestorContainer)) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '12px';
            img.style.margin = '15px auto';
            img.style.display = 'block';
            img.style.border = '1px solid rgba(255,255,255,0.05)';

            range.deleteContents();
            range.insertNode(img);

            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);

            setCampaignContent(campaignEditorRef.current.innerHTML);
            return;
          }
        }
        campaignEditorRef.current.innerHTML += imgHtml;
        setCampaignContent(campaignEditorRef.current.innerHTML);
      } else {
        syncEditorState();
        setSettingsTab('content');
        setEditorActiveTab('body');
        setCampaignContent(prev => (prev || '') + imgHtml);
      }
    }
  };

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r?\n/g, '<br/>');

    if (typeof document !== 'undefined') {
      if (document.queryCommandSupported('insertHTML')) {
        document.execCommand('insertHTML', false, html);
      } else {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        selection.deleteFromDocument();
        const el = document.createElement('div');
        el.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node;
        while ((node = el.firstChild)) {
          frag.appendChild(node);
        }
        selection.getRangeAt(0).insertNode(frag);
      }

      if (campaignEditorRef.current) {
        const newHtml = campaignEditorRef.current.innerHTML;
        if (editorActiveTab === 'body') setCampaignContent(newHtml);
        else if (editorActiveTab === 'title') setEmailTitle(newHtml);
        else if (editorActiveTab === 'footer') setFooterText(newHtml);
      }
    }
  };

  const handleUseTemplateAsCover = (imgUrl: string) => {
    setImageUrl(imgUrl);
    showToast('Portada actualizada.', 'info');
  };

  const handleUseTemplateAsBg = (imgUrl: string) => {
    setBgImageUrl(imgUrl);
    showToast('Fondo general actualizado.', 'info');
  };

  // Draft Features
  const saveCampaignDraft = () => {
    const draft = {
      campaignSubject,
      campaignTitle,
      campaignContent,
      templateType,
      bgImageUrl,
      bgOpacity,
      bgSaturation,
      bgPosition,
      ctaText,
      ctaLink,
      fontFamily,
      titleFontFamily,
      footerFontFamily,
      emailTitle,
      footerText,
      imageUrl,
      campTitleTextColor,
      campTitleBgColor,
      campTitlePadding,
      campTitleRadius,
      campBodyTextColor,
      campBodyBgColor,
      campBodyPadding,
      campBodyRadius,
      campBodyAlignment,
      campFooterTextColor,
      campFooterBgColor,
      campFooterPadding,
      campFooterRadius,
      campCardMaxWidthDesktop,
      campCardPaddingDesktop,
      campCardPaddingTablet,
      campCardPaddingMobile,
      campTitleFontSizeDesktop,
      campTitleFontSizeTablet,
      campTitleFontSizeMobile,
      campBodyFontSizeDesktop,
      campBodyFontSizeTablet,
      campBodyFontSizeMobile,
      campBodyAlignmentTablet,
      campBodyAlignmentMobile,
      campImageWidth,
      campImageAlign,
      campImageRadius,
      campImageWidthTablet,
      campImageWidthMobile,
      campImageAlignTablet,
      campImageAlignMobile,
      campCtaAlignment,
      campCtaAlignTablet,
      campCtaAlignMobile,
      campCtaMarginTop,
      campCtaMarginBottom,
      campTextMode
    };
    try {
      localStorage.setItem('nectar_labs_admin_campaign_draft', JSON.stringify(draft));
      setHasDraft(true);
    } catch (e) {
      console.warn('Failed to save campaign draft:', e);
    }
  };

  const restoreDraft = () => {
    try {
      const draftStr = localStorage.getItem('nectar_labs_admin_campaign_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        setCampaignSubject(draft.campaignSubject || '');
        setCampaignTitle(draft.campaignTitle || '');
        setCampaignContent(draft.campaignContent || '');
        setTemplateType(draft.templateType || 'minimalist');
        setBgImageUrl(draft.bgImageUrl || '');
        setBgOpacity(draft.bgOpacity || '1.0');
        setBgSaturation(draft.bgSaturation || '100');
        setBgPosition(draft.bgPosition || 'center');
        setCtaText(draft.ctaText || '');
        setCtaLink(draft.ctaLink || '');
        setFontFamily(draft.fontFamily || 'serif');
        setTitleFontFamily(draft.titleFontFamily || 'serif');
        setFooterFontFamily(draft.footerFontFamily || 'serif');
        setEmailTitle(draft.emailTitle || '');
        setFooterText(draft.footerText || '');
        setImageUrl(draft.imageUrl || '');
        setCampTitleTextColor(draft.campTitleTextColor || '#ffffff');
        setCampTitleBgColor(draft.campTitleBgColor || 'transparent');
        setCampTitlePadding(draft.campTitlePadding || '0px');
        setCampTitleRadius(draft.campTitleRadius || '0px');
        setCampBodyTextColor(draft.campBodyTextColor || '');
        setCampBodyBgColor(draft.campBodyBgColor || 'transparent');
        setCampBodyPadding(draft.campBodyPadding || '0px');
        setCampBodyRadius(draft.campBodyRadius || '0px');
        setCampBodyAlignment(draft.campBodyAlignment || 'center');
        setCampFooterTextColor(draft.campFooterTextColor || '');
        setCampFooterBgColor(draft.campFooterBgColor || 'transparent');
        setCampFooterPadding(draft.campFooterPadding || '0px');
        setCampFooterRadius(draft.campFooterRadius || '0px');
        setCampCardMaxWidthDesktop(draft.campCardMaxWidthDesktop || '680px');
        setCampCardPaddingDesktop(draft.campCardPaddingDesktop || '40px');
        setCampCardPaddingTablet(draft.campCardPaddingTablet || '40px');
        setCampCardPaddingMobile(draft.campCardPaddingMobile || '16px');
        setCampTitleFontSizeDesktop(draft.campTitleFontSizeDesktop || '26px');
        setCampTitleFontSizeTablet(draft.campTitleFontSizeTablet || '22px');
        setCampTitleFontSizeMobile(draft.campTitleFontSizeMobile || '18px');
        setCampBodyFontSizeDesktop(draft.campBodyFontSizeDesktop || '16px');
        setCampBodyFontSizeTablet(draft.campBodyFontSizeTablet || '15px');
        setCampBodyFontSizeMobile(draft.campBodyFontSizeMobile || '14px');
        setCampBodyAlignmentTablet(draft.campBodyAlignmentTablet || 'center');
        setCampBodyAlignmentMobile(draft.campBodyAlignmentMobile || 'center');
        setCampImageWidth(draft.campImageWidth || '100%');
        setCampImageAlign(draft.campImageAlign || 'center');
        setCampImageRadius(draft.campImageRadius || '20px');
        setCampImageWidthTablet(draft.campImageWidthTablet || '100%');
        setCampImageWidthMobile(draft.campImageWidthMobile || '100%');
        setCampImageAlignTablet(draft.campImageAlignTablet || 'center');
        setCampImageAlignMobile(draft.campImageAlignMobile || 'center');
        setCampCtaAlignment(draft.campCtaAlignment || 'center');
        setCampCtaAlignTablet(draft.campCtaAlignTablet || 'center');
        setCampCtaAlignMobile(draft.campCtaAlignMobile || 'center');
        setCampCtaMarginTop(draft.campCtaMarginTop || '35px');
        setCampCtaMarginBottom(draft.campCtaMarginBottom || '25px');
        setCampTextMode(draft.campTextMode || 'letter');

        if (campaignEditorRef.current) {
          if (editorActiveTab === 'body') {
            campaignEditorRef.current.innerHTML = draft.campaignContent || '';
          } else if (editorActiveTab === 'title') {
            campaignEditorRef.current.innerHTML = draft.emailTitle || '';
          } else if (editorActiveTab === 'footer') {
            campaignEditorRef.current.innerHTML = draft.footerText || '';
          }
        }
        showToast('Borrador restaurado con éxito.', 'success');
      }
    } catch (e) {
      console.error('Failed to restore draft:', e);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem('nectar_labs_admin_campaign_draft');
    setHasDraft(false);
    showToast('Borrador descartado.', 'info');
  };

  // Auto save draft hook
  useEffect(() => {
    if (showCampaignModal && !isDraftPending.current) {
      isDraftPending.current = true;
      const timer = setTimeout(() => {
        syncEditorState();
        saveCampaignDraft();
        isDraftPending.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [
    showCampaignModal,
    campaignSubject,
    campaignTitle,
    campaignContent,
    templateType,
    bgImageUrl,
    bgOpacity,
    bgSaturation,
    bgPosition,
    ctaText,
    ctaLink,
    fontFamily,
    titleFontFamily,
    footerFontFamily,
    emailTitle,
    footerText,
    imageUrl,
    campTitleTextColor,
    campTitleBgColor,
    campTitlePadding,
    campTitleRadius,
    campBodyTextColor,
    campBodyBgColor,
    campBodyPadding,
    campBodyRadius,
    campBodyAlignment,
    campFooterTextColor,
    campFooterBgColor,
    campFooterPadding,
    campFooterRadius,
    campCardMaxWidthDesktop,
    campCardPaddingDesktop,
    campCardPaddingTablet,
    campCardPaddingMobile,
    campTitleFontSizeDesktop,
    campTitleFontSizeTablet,
    campTitleFontSizeMobile,
    campBodyFontSizeDesktop,
    campBodyFontSizeTablet,
    campBodyFontSizeMobile,
    campBodyAlignmentTablet,
    campBodyAlignmentMobile,
    campImageWidth,
    campImageAlign,
    campImageRadius,
    campImageWidthTablet,
    campImageWidthMobile,
    campImageAlignTablet,
    campImageAlignMobile,
    campCtaAlignment,
    campCtaAlignTablet,
    campCtaAlignMobile,
    campCtaMarginTop,
    campCtaMarginBottom,
    campTextMode
  ]);

  // Load draft check on modal open
  useEffect(() => {
    if (showCampaignModal) {
      const draft = localStorage.getItem('nectar_labs_admin_campaign_draft');
      setHasDraft(!!draft);
      if (campaignEditorRef.current) {
        if (editorActiveTab === 'body') campaignEditorRef.current.innerHTML = campaignContent || '';
        else if (editorActiveTab === 'title') campaignEditorRef.current.innerHTML = emailTitle || '';
        else if (editorActiveTab === 'footer') campaignEditorRef.current.innerHTML = footerText || '';
      }
    }
  }, [showCampaignModal, editorActiveTab]);

  // Marketing Lists CRUD
  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: listName.trim(),
        description: listDescription.trim(),
        tenant: null
      };

      if (editingListId) {
        await fetcher(`/newsletter/lists/${editingListId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('Lista de marketing actualizada.', 'success');
      } else {
        await fetcher('/newsletter/lists/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('Lista de marketing creada con éxito.', 'success');
      }

      setListName('');
      setListDescription('');
      setEditingListId(null);
      setShowListModal(false);
      loadMarketingData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar la lista.', 'error');
    }
  };

  const handleDeleteList = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta lista de contactos?')) return;
    try {
      await fetcher(`/newsletter/lists/${id}/`, {
        method: 'DELETE'
      });
      showToast('Lista eliminada con éxito.', 'success');
      loadMarketingData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar la lista.', 'error');
    }
  };

  // Contacts / Subscribers CRUD
  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        email: subEmail.trim(),
        name: subName.trim(),
        tags: subTags.trim(),
        is_premium: subIsPremium,
        tenant: null
      };

      if (editingSubId) {
        await fetcher(`/newsletter/subscribers/${editingSubId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('Contacto actualizado.', 'success');
      } else {
        const createdSub = await fetcher('/newsletter/subscribers/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // Add to list if specified
        if (subListId) {
          const list = lists.find(l => l.id === subListId);
          if (list) {
            const currentSubs = list.subscribers || [];
            await fetcher(`/newsletter/lists/${subListId}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscribers: [...currentSubs, createdSub.id]
              })
            });
          }
        }
        showToast('Contacto añadido con éxito.', 'success');
      }

      setSubEmail('');
      setSubName('');
      setSubTags('');
      setSubIsPremium(false);
      setSubListId(null);
      setEditingSubId(null);
      setShowSubModal(false);
      loadMarketingData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar contacto.', 'error');
    }
  };

  const handleDeleteSub = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este contacto?')) return;
    try {
      await fetcher(`/newsletter/subscribers/${id}/`, {
        method: 'DELETE'
      });
      showToast('Contacto eliminado con éxito.', 'success');
      loadMarketingData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el contacto.', 'error');
    }
  };

  // CSV Contacts Import
  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return showToast('Selecciona un archivo CSV.', 'warning');
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('tenant_id', 'null');
    if (importListId) {
      formData.append('marketing_list_id', String(importListId));
    }

    try {
      const res = await fetcher('/newsletter/subscribers/import_csv/', {
        method: 'POST',
        body: formData
      });
      showToast(res.message || 'Importación completada con éxito.', 'success');
      setShowImportModal(false);
      setImportFile(null);
      setImportListId(null);
      loadMarketingData();
    } catch (err: any) {
      showToast(err.message || 'Error al importar contactos.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Campaign creation and dispatch
  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingCampaign(true);
    syncEditorState();

    try {
      // 1. Create the campaign
      const campaignPayload = {
        subject: campaignSubject.trim(),
        content: campaignContent,
        marketing_list: selectedListId ? parseInt(selectedListId) : null,
        template_type: templateType,
        bg_opacity: parseFloat(bgOpacity),
        bg_saturation: parseInt(bgSaturation),
        bg_position: bgPosition,
        cta_text: ctaText.trim() || null,
        cta_link: ctaLink.trim() || null,
        font_family: fontFamily,
        title_font_family: titleFontFamily,
        footer_font_family: footerFontFamily,
        email_title: emailTitle.trim() || null,
        footer_text: footerText.trim() || null,
        image_style: {
          width: campImageWidth,
          align: campImageAlign,
          radius: campImageRadius,
        },
        custom_styles: {
          text_mode: campTextMode,
          body_alignment: campBodyAlignment,
          body_alignment_tablet: campBodyAlignmentTablet,
          body_alignment_mobile: campBodyAlignmentMobile,
          card_max_width_desktop: campCardMaxWidthDesktop,
          card_padding_desktop: campCardPaddingDesktop,
          card_padding_tablet: campCardPaddingTablet,
          card_padding_mobile: campCardPaddingMobile,
          title_font_size_desktop: campTitleFontSizeDesktop,
          title_font_size_tablet: campTitleFontSizeTablet,
          title_font_size_mobile: campTitleFontSizeMobile,
          body_font_size_desktop: campBodyFontSizeDesktop,
          body_font_size_tablet: campBodyFontSizeTablet,
          body_font_size_mobile: campBodyFontSizeMobile,
          title_color: campTitleTextColor,
          title_bg_color: campTitleBgColor,
          body_color: campBodyTextColor,
          body_bg_color: campBodyBgColor,
          footer_color: campFooterTextColor,
          footer_bg_color: campFooterBgColor,
          cta_alignment: campCtaAlignment,
          cta_alignment_tablet: campCtaAlignTablet,
          cta_alignment_mobile: campCtaAlignMobile,
          image_width_tablet: campImageWidthTablet,
          image_align_tablet: campImageAlignTablet,
          image_width_mobile: campImageWidthMobile,
          image_align_mobile: campImageAlignMobile,
        }
      };

      const campaign = await fetcher('/newsletter/campaigns/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignPayload)
      });

      // 2. Upload cover/background images if they are URLs from library, or set them
      if (imageUrl || bgImageUrl) {
        await fetcher(`/newsletter/campaigns/${campaign.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl || null,
            bg_image_url: bgImageUrl || null
          })
        });
      }

      // 3. Dispatch the campaign
      const dispatchRes = await fetcher(`/newsletter/campaigns/${campaign.id}/send_campaign/`, {
        method: 'POST'
      });

      showToast(dispatchRes.message || 'Campaña enviada con éxito.', 'success');
      
      // Clear states & draft
      localStorage.removeItem('nectar_labs_admin_campaign_draft');
      setHasDraft(false);
      setCampaignSubject('');
      setCampaignTitle('');
      setCampaignContent('');
      setEmailTitle('');
      setFooterText('');
      setImageUrl('');
      setBgImageUrl('');
      setShowCampaignModal(false);
      loadMarketingData();
    } catch (err: any) {
      showToast(err.message || 'Error al enviar la campaña.', 'error');
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta campaña?')) return;
    try {
      await fetcher(`/newsletter/campaigns/${id}/`, {
        method: 'DELETE'
      });
      showToast('Campaña eliminada con éxito.', 'success');
      loadMarketingData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar campaña.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="admin-card border rounded-[2rem] p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-6 bg-card-bg border-card-border">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-nectar-gold/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] flex items-center justify-center text-3xl border border-white/5">
          📢
        </div>
        <div className="flex-1 text-center md:text-left space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tight text-white font-bold">Consola de Marketing (Néctar Labs)</h2>
          <p className="text-xs text-white/50 leading-relaxed font-medium">
            Redacta boletines masivos para los clientes y prospectos de la plataforma utilizando plantillas de diseño responsivas avanzadas.
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-[#050a06]/40 border border-white/5 rounded-2xl p-1 gap-1 w-full max-w-md">
        {[
          { id: 'campaigns', label: 'Campañas' },
          { id: 'lists', label: 'Listas de Contactos' },
          { id: 'subscribers', label: 'Suscriptores' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
              activeSubTab === tab.id
                ? 'bg-nectar-gold text-background shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loadingData ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <span className="w-8 h-8 rounded-full border-4 border-t-white border-white/10 animate-spin"></span>
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-white/40">Cargando datos...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: CAMPAIGNS */}
          {activeSubTab === 'campaigns' && (
            <div className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Boletines & Campañas</h3>
                  <p className="text-[9px] font-bold text-foreground/45 mt-1 uppercase">Historial de correos enviados y campañas activas</p>
                </div>
                <button
                  onClick={() => {
                    setCampaignSubject('');
                    setCampaignTitle('');
                    setCampaignContent('');
                    setEmailTitle('');
                    setFooterText('');
                    setImageUrl('');
                    setBgImageUrl('');
                    setShowCampaignModal(true);
                  }}
                  className="px-6 py-2.5 bg-nectar-gold hover:bg-nectar-gold/90 text-background rounded-xl text-[8px] font-black uppercase tracking-widest transition-all font-bold"
                >
                  🚀 Crear Campaña
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                      <th className="pb-4">Asunto / Campaña</th>
                      <th className="pb-4">Lista Destino</th>
                      <th className="pb-4">Diseño</th>
                      <th className="pb-4">Estado</th>
                      <th className="pb-4 text-right">Fecha Envió</th>
                      <th className="pb-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(camp => (
                      <tr key={camp.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.01] transition-colors">
                        <td className="py-4">
                          <p className="font-bold text-sm text-white">{camp.subject}</p>
                          <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">ID: {camp.id}</p>
                        </td>
                        <td className="py-4 text-xs font-bold opacity-80">
                          {camp.marketing_list_detail?.name || 'Toda la Plataforma'}
                        </td>
                        <td className="py-4 text-xs font-mono font-bold text-nectar-gold uppercase">
                          {camp.template_type}
                        </td>
                        <td className="py-4">
                          {camp.is_sent ? (
                            <span className="px-2.5 py-1 bg-green-500/10 text-green-500 border border-green-500/20 text-[7px] font-black uppercase tracking-widest rounded-full">Enviado</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[7px] font-black uppercase tracking-widest rounded-full">Borrador</span>
                          )}
                        </td>
                        <td className="py-4 text-right text-xs font-bold opacity-60">
                          {camp.sent_at ? new Date(camp.sent_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-900/30 text-red-400 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                          No hay campañas creadas aún
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: LISTS */}
          {activeSubTab === 'lists' && (
            <div className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Listas de Contactos</h3>
                  <p className="text-[9px] font-bold text-foreground/45 mt-1 uppercase">Segmenta tus usuarios en listas de envíos específicas</p>
                </div>
                <button
                  onClick={() => {
                    setListName('');
                    setListDescription('');
                    setEditingListId(null);
                    setShowListModal(true);
                  }}
                  className="px-6 py-2.5 bg-nectar-gold hover:bg-nectar-gold/90 text-background rounded-xl text-[8px] font-black uppercase tracking-widest transition-all font-bold"
                >
                  + Nueva Lista
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lists.map(list => (
                  <div key={list.id} className="p-6 rounded-2xl bg-background/50 border border-card-border/80 relative flex flex-col justify-between h-48 hover:border-nectar-gold/30 transition-all duration-300">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-black text-white">{list.name}</h4>
                        <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/25 font-bold">
                          {list.subscriber_count ?? 0} contactos
                        </span>
                      </div>
                      <p className="text-[10px] text-white/50 mt-2 font-medium line-clamp-3 leading-relaxed">
                        {list.description || 'Sin descripción adicional.'}
                      </p>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t border-white/5">
                      <button
                        onClick={() => {
                          setListName(list.name);
                          setListDescription(list.description);
                          setEditingListId(list.id);
                          setShowListModal(true);
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-900/30 text-red-400 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {lists.length === 0 && (
                  <div className="col-span-full py-16 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                    No has creado listas de contactos aún
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SUBSCRIBERS */}
          {activeSubTab === 'subscribers' && (
            <div className="p-8 md:p-10 rounded-[3rem] bg-card-bg border border-card-border shadow-xl relative space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Directorio de Suscriptores</h3>
                  <p className="text-[9px] font-bold text-foreground/45 mt-1 uppercase">Visualiza y gestiona los contactos registrados en Néctar Labs</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportFile(null);
                      setImportListId(null);
                      setShowImportModal(true);
                    }}
                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all text-white font-bold"
                  >
                    📥 Importar CSV
                  </button>
                  <button
                    onClick={() => {
                      setSubEmail('');
                      setSubName('');
                      setSubTags('');
                      setSubIsPremium(false);
                      setSubListId(null);
                      setEditingSubId(null);
                      setShowSubModal(true);
                    }}
                    className="px-6 py-2.5 bg-nectar-gold hover:bg-nectar-gold/90 text-background rounded-xl text-[8px] font-black uppercase tracking-widest transition-all font-bold"
                  >
                    + Añadir Suscriptor
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-card-border/50 text-[8px] font-black uppercase tracking-widest opacity-40">
                      <th className="pb-4">Nombre / Correo</th>
                      <th className="pb-4">Tags</th>
                      <th className="pb-4">Plan Premium</th>
                      <th className="pb-4">Estado</th>
                      <th className="pb-4 text-right">Fecha Registro</th>
                      <th className="pb-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map(sub => (
                      <tr key={sub.id} className="border-b border-card-border/30 last:border-0 hover:bg-foreground/[0.01] transition-colors">
                        <td className="py-4">
                          <p className="font-bold text-sm text-white">{sub.name || 'Sin Nombre'}</p>
                          <p className="text-xs font-bold text-white/50">{sub.email}</p>
                        </td>
                        <td className="py-4">
                          {sub.tags ? (
                            sub.tags.split(',').map((tag, idx) => (
                              <span key={idx} className="mr-1.5 px-2 py-0.5 bg-white/5 border border-white/10 text-white/60 text-[7px] font-black uppercase tracking-wider rounded-md font-mono">
                                {tag.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-white/20 italic font-bold">Sin tags</span>
                          )}
                        </td>
                        <td className="py-4">
                          {sub.is_premium ? (
                            <span className="px-2 py-0.5 bg-[#C68A1E]/10 text-[#C68A1E] text-[7px] font-black uppercase tracking-widest rounded-full border border-[#C68A1E]/20 font-bold">Premium VIP</span>
                          ) : (
                            <span className="text-xs text-white/30 font-bold">Estándar</span>
                          )}
                        </td>
                        <td className="py-4">
                          {sub.is_active ? (
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 text-[7px] font-black uppercase tracking-widest rounded-full">Activo</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[7px] font-black uppercase tracking-widest rounded-full">Inactivo</span>
                          )}
                        </td>
                        <td className="py-4 text-right text-xs font-bold opacity-60">
                          {new Date(sub.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-4 text-right flex justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSubEmail(sub.email);
                              setSubName(sub.name);
                              setSubTags(sub.tags);
                              setSubIsPremium(sub.is_premium);
                              setEditingSubId(sub.id);
                              setSubListId(null);
                              setShowSubModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteSub(sub.id)}
                            className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-900/30 text-red-400 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {subscribers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[9px] font-black uppercase tracking-widest opacity-25">
                          No hay suscriptores añadidos aún
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📁 MODAL: CREAR/EDITAR LISTA */}
      {showListModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-neutral-900 border border-white/10 p-8 rounded-[2rem] shadow-2xl relative space-y-6">
            <button
              onClick={() => setShowListModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl font-bold cursor-pointer"
            >
              ×
            </button>
            <div>
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Segmentación
              </span>
              <h2 className="text-xl font-black tracking-tighter mt-4 leading-none text-white">
                {editingListId ? 'Editar Lista de Marketing' : 'Nueva Lista de Marketing'}
              </h2>
            </div>
            <form onSubmit={handleSaveList} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-white">Nombre de la Lista</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Clientes VIP, Prospectos, Newsletter Principal"
                  value={listName}
                  onChange={e => setListName(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-xs bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-white">Descripción</label>
                <textarea
                  placeholder="Notas internas sobre esta lista..."
                  value={listDescription}
                  onChange={e => setListDescription(e.target.value)}
                  rows={3}
                  className="w-full border rounded-xl px-4 py-3 text-xs bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-medium"
                />
              </div>
              <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowListModal(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-white/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-nectar-gold text-background hover:bg-nectar-gold/90 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all font-bold"
                >
                  {editingListId ? 'Actualizar' : 'Crear Lista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📁 MODAL: CREAR/EDITAR SUSCRIPTOR */}
      {showSubModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-neutral-900 border border-white/10 p-8 rounded-[2rem] shadow-2xl relative space-y-6">
            <button
              onClick={() => setShowSubModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl font-bold cursor-pointer"
            >
              ×
            </button>
            <div>
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Contactos
              </span>
              <h2 className="text-xl font-black tracking-tighter mt-4 leading-none text-white">
                {editingSubId ? 'Editar Suscriptor' : 'Añadir Nuevo Suscriptor'}
              </h2>
            </div>
            <form onSubmit={handleSaveSub} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-white">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Nombre..."
                  value={subName}
                  onChange={e => setSubName(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-xs bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-white">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={subEmail}
                  onChange={e => setSubEmail(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-xs bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-white">Etiquetas (Separadas por comas)</label>
                <input
                  type="text"
                  placeholder="ej: cliente, newsletter, lead"
                  value={subTags}
                  onChange={e => setSubTags(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-xs bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-mono text-[10px]"
                />
              </div>
              {!editingSubId && (
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-white">Vincular a Lista de Envío</label>
                  <select
                    value={subListId || ''}
                    onChange={e => setSubListId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full border rounded-xl px-4 py-3 text-xs bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                  >
                    <option value="" className="bg-neutral-900 text-white">Ninguna (General)</option>
                    {lists.map(l => (
                      <option key={l.id} value={l.id} className="bg-neutral-900 text-white">{l.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="sub-is-premium"
                  checked={subIsPremium}
                  onChange={e => setSubIsPremium(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 accent-nectar-gold cursor-pointer"
                />
                <label htmlFor="sub-is-premium" className="text-xs text-white/80 font-bold select-none cursor-pointer">
                  Marcar como usuario Premium VIP
                </label>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-white/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-nectar-gold text-background hover:bg-nectar-gold/90 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all font-bold"
                >
                  {editingSubId ? 'Actualizar' : 'Guardar Contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📥 MODAL: IMPORTAR CONTACTOS CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-neutral-900 border border-white/10 p-8 rounded-[2rem] shadow-2xl relative space-y-6">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full border border-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl font-bold cursor-pointer"
            >
              ×
            </button>
            <div>
              <span className="px-3 py-1 bg-nectar-gold/10 text-nectar-gold text-[8px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                Importación Masiva
              </span>
              <h2 className="text-xl font-black tracking-tighter mt-4 leading-none text-white">
                Importar Contactos por CSV
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1.5">
                Carga un archivo delimitado por comas (.csv). Debe contener al menos la columna `email`.
              </p>
            </div>
            <form onSubmit={handleImportCSV} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-white">Vincular a la Lista (Opcional)</label>
                <select
                  value={importListId || ''}
                  onChange={e => setImportListId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full border rounded-xl px-4 py-3 text-xs bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                >
                  <option value="" className="bg-neutral-900 text-white">-- No Vincular a Lista --</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id} className="bg-neutral-900 text-white">{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block text-white">Archivo CSV</label>
                <input
                  type="file"
                  required
                  accept=".csv"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="w-full border border-dashed border-white/10 rounded-xl px-4 py-6 text-xs text-white/60 bg-white/5 hover:bg-white/10 transition-all font-bold cursor-pointer"
                />
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-white/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-6 py-2 bg-nectar-gold text-background hover:bg-nectar-gold/90 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all font-bold"
                >
                  {isImporting ? 'Importando...' : '📥 Iniciar Importación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📧 MODAL: REDACTAR/ENVIAR CAMPAÑA */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-55 bg-background/80 backdrop-blur-md flex items-start justify-center p-4 md:p-8 overflow-y-auto">
          <div className="admin-card border border-white/10 bg-neutral-900 rounded-[2.5rem] p-8 w-full max-w-7xl relative flex flex-col lg:flex-row gap-8 max-h-[90vh] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCampaignModal(false)}
              className="absolute top-6 right-6 text-white/40 hover:text-white text-xs font-bold w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all z-50"
            >
              ✕
            </button>

            {/* Column 1: Editor Form */}
            <div className={`${isPreviewExpanded ? 'hidden' : 'flex-1'} overflow-y-auto pr-2 custom-scrollbar space-y-6 lg:max-h-[76vh]`}>
              <div>
                <span className="px-2 py-0.5 bg-nectar-gold/10 text-nectar-gold text-[7px] font-black uppercase tracking-widest rounded-full border border-nectar-gold/20">
                  Email Campaigner
                </span>
                <h3 className="text-lg font-black uppercase tracking-tight text-white mt-2">Nueva Campaña de Boletín</h3>
                <p className="text-[7.5px] text-white/40 uppercase tracking-wider mt-0.5">Diseña y personaliza el correo con la estética premium de ms-ambar</p>
              </div>

              {hasDraft && (
                <div className="bg-nectar-gold/10 border border-nectar-gold/30 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <p className="text-xs font-bold text-nectar-gold uppercase tracking-wider font-bold">Borrador Detectado</p>
                    <p className="text-[10px] text-white/70 mt-0.5">Se encontró progreso no guardado de tu última sesión de edición.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={restoreDraft}
                      className="bg-nectar-gold text-background font-black uppercase tracking-widest text-[9px] px-3.5 py-2 rounded-lg hover:scale-105 transition-all font-bold"
                    >
                      Restaurar
                    </button>
                    <button
                      type="button"
                      onClick={discardDraft}
                      className="border border-white/10 hover:bg-white/5 text-white/65 hover:text-white font-black uppercase tracking-widest text-[9px] px-3.5 py-2 rounded-lg transition-all font-bold"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Tab Bar for Editor Settings */}
              <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-1 overflow-x-auto custom-scrollbar">
                {[
                  { id: 'content', label: 'Contenido' },
                  { id: 'theme', label: 'Diseño' },
                  { id: 'cover', label: 'Portada' },
                  { id: 'sections', label: 'Espaciado' },
                  { id: 'ctas', label: 'Botones' },
                  { id: 'library', label: 'Biblioteca' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      syncEditorState();
                      setSettingsTab(tab.id as any);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                      settingsTab === tab.id
                        ? 'bg-nectar-gold text-background shadow-md scale-[1.02]'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendCampaign} className="space-y-6 text-left">
                {/* Viewport switcher */}
                {['cover', 'sections', 'ctas'].includes(settingsTab) && (
                  <div className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-2xl">
                    <span className="text-[9px] text-white/65 uppercase tracking-widest font-black">Vista previa activa:</span>
                    <div className="flex bg-neutral-950 border border-white/10 rounded-xl p-0.5 gap-0.5">
                      {[
                        { id: 'desktop', label: 'Escritorio' },
                        { id: 'tablet', label: 'Tablet' },
                        { id: 'mobile', label: 'Móvil' },
                      ].map(vp => (
                        <button
                          key={vp.id}
                          type="button"
                          onClick={() => setPreviewViewport(vp.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                            previewViewport === vp.id
                              ? 'bg-nectar-gold text-background shadow-md font-bold'
                              : 'text-white/65 hover:text-white hover:bg-white/5 font-medium'
                          }`}
                        >
                          {vp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CATEGORY 1: CONTENT */}
                {settingsTab === 'content' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Lista de Destinatarios (Enviar a)</label>
                      <select
                        value={selectedListId}
                        onChange={e => setSelectedListId(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2.5 text-[10px] bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                      >
                        <option value="" className="bg-neutral-900 text-white">Toda la Plataforma (Todos los Suscriptores)</option>
                        {lists.map(l => (
                          <option key={l.id} value={String(l.id)} className="bg-neutral-900 text-white">{l.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 relative">
                      <div className="flex justify-between items-center">
                        <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Asunto del Correo (Subject)</label>
                        <button
                          type="button"
                          onClick={() => setEmojiPopoverTarget(emojiPopoverTarget === 'subject' ? null : 'subject')}
                          className="text-[8px] text-nectar-gold hover:underline flex items-center gap-1 font-black uppercase"
                        >
                          😀 Emojis
                        </button>
                      </div>
                      <input
                        id="camp-subject-input"
                        type="text"
                        required
                        placeholder="Ej. ¡Novedades de la plataforma!"
                        value={campaignSubject}
                        onChange={(e) => setCampaignSubject(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2.5 text-[10px] bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                      />
                      {emojiPopoverTarget === 'subject' && (
                        <div className="absolute right-0 top-[55px] z-[100] bg-neutral-950 border border-white/10 rounded-2xl p-3 shadow-2xl w-60 grid grid-cols-6 gap-2">
                          {CURATED_EMOJIS.map(em => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => {
                                insertEmojiToSubject(em);
                                setEmojiPopoverTarget(null);
                              }}
                              className="text-lg hover:bg-white/5 p-1 rounded transition-all text-center"
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Formato del Texto</label>
                      <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-1 w-fit">
                        {[
                          { id: 'poem', label: 'Modo Poema (Saltos de Línea)' },
                          { id: 'letter', label: 'Modo Carta (Texto Continuo)' },
                        ].map(mode => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setCampTextMode(mode.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                              campTextMode === mode.id
                                ? 'bg-nectar-gold text-background shadow-md font-bold'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Contenido del Correo</label>
                        <span className="text-[8px] bg-nectar-gold/10 text-nectar-gold border border-nectar-gold/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Editando: {editorActiveTab === 'title' ? 'Título' : editorActiveTab === 'footer' ? 'Pie' : 'Cuerpo'}
                        </span>
                      </div>

                      {/* Segmented Tab Controls */}
                      <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
                        {[
                          { id: 'title', label: 'Título / Cabecera' },
                          { id: 'body', label: 'Cuerpo del Correo' },
                          { id: 'footer', label: 'Pie de Página (Footer)' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              if (campaignEditorRef.current) {
                                const html = campaignEditorRef.current.innerHTML;
                                if (editorActiveTab === 'body') setCampaignContent(html);
                                else if (editorActiveTab === 'title') setEmailTitle(html);
                                else if (editorActiveTab === 'footer') setFooterText(html);
                              }
                              setEditorActiveTab(tab.id as any);
                            }}
                            className={`flex-1 py-2 text-center rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                              editorActiveTab === tab.id
                                ? 'bg-nectar-gold text-background shadow-md font-bold'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Editor Canvas Toolbar */}
                      <div className="bg-white/5 border border-white/10 p-2 rounded-2xl flex flex-wrap gap-1 items-center shadow-lg">
                        <button
                          type="button"
                          onClick={() => executeCommand('bold')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center font-bold"
                          title="Negrita"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => executeCommand('italic')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center italic"
                          title="Itálica"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => executeCommand('underline')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center underline"
                          title="Subrayado"
                        >
                          U
                        </button>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        <button
                          type="button"
                          onClick={() => executeCommand('justifyLeft')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center"
                          title="Alinear Izquierda"
                        >
                          ⇐
                        </button>
                        <button
                          type="button"
                          onClick={() => executeCommand('justifyCenter')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center"
                          title="Alinear Centro"
                        >
                          ⇔
                        </button>
                        <button
                          type="button"
                          onClick={() => executeCommand('justifyRight')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center"
                          title="Alinear Derecha"
                        >
                          ⇒
                        </button>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        <button
                          type="button"
                          onClick={() => executeCommand('formatBlock', '<h2>')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center font-black text-xs"
                          title="Título H2"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => executeCommand('formatBlock', '<h3>')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center font-black text-xs"
                          title="Título H3"
                        >
                          H3
                        </button>
                        <button
                          type="button"
                          onClick={() => executeCommand('formatBlock', '<p>')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center text-xs"
                          title="Párrafo"
                        >
                          P
                        </button>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        <button
                          type="button"
                          onClick={() => executeCommand('insertUnorderedList')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center text-xs font-bold"
                          title="Lista Viñetas"
                        >
                          • L
                        </button>
                        <button
                          type="button"
                          onClick={() => executeCommand('insertOrderedList')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center text-xs font-bold"
                          title="Lista Numérica"
                        >
                          1. L
                        </button>
                        <button
                          type="button"
                          onClick={() => executeCommand('formatBlock', '<blockquote>')}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center italic font-serif text-sm font-bold"
                          title="Cita"
                        >
                          “
                        </button>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        <button
                          type="button"
                          onClick={handleLinkInsert}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center text-xs"
                          title="Insertar Enlace"
                        >
                          🔗
                        </button>
                        <button
                          type="button"
                          onClick={handleImageInsert}
                          className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center text-xs"
                          title="Insertar Imagen por URL"
                        >
                          🖼️
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setEmojiPopoverTarget(emojiPopoverTarget === 'editor' ? null : 'editor')}
                            className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center text-xs"
                            title="Insertar Emoji"
                          >
                            😀
                          </button>
                          {emojiPopoverTarget === 'editor' && (
                            <div className="absolute left-0 top-10 z-[100] bg-neutral-950 border border-white/10 rounded-2xl p-3 shadow-2xl w-60 grid grid-cols-6 gap-2">
                              {CURATED_EMOJIS.map(em => (
                                <button
                                  key={em}
                                  type="button"
                                  onClick={() => {
                                    insertEmojiToEditor(em);
                                    setEmojiPopoverTarget(null);
                                  }}
                                  className="text-lg hover:bg-white/5 p-1 rounded transition-all text-center"
                                >
                                  {em}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => executeCommand('removeFormat')}
                          className="w-8 h-8 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center ml-auto text-xs font-bold"
                          title="Limpiar Formatos"
                        >
                          🧹
                        </button>
                      </div>

                      {/* Content Editable Area */}
                      <div
                        ref={campaignEditorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={e => {
                          const html = e.currentTarget.innerHTML;
                          if (editorActiveTab === 'body') setCampaignContent(html);
                          else if (editorActiveTab === 'title') setEmailTitle(html);
                          else if (editorActiveTab === 'footer') setFooterText(html);
                        }}
                        onPaste={handleEditorPaste}
                        data-placeholder={
                          editorActiveTab === 'title'
                            ? 'Escribe un título personalizado...'
                            : editorActiveTab === 'footer'
                              ? 'Escribe un pie de página...'
                              : 'Comienza a redactar el cuerpo del mensaje...'
                        }
                        className="w-full min-h-[220px] max-h-[380px] overflow-y-auto bg-white/5 text-white border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-nectar-gold transition-all"
                        style={{ outline: 'none' }}
                      />
                    </div>
                  </div>
                )}

                {/* CATEGORY 2: THEME */}
                {settingsTab === 'theme' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[8px] text-white/60 uppercase tracking-widest font-black block">Diseño Premium de Plantilla</label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { id: 'minimalist', name: 'Carbon', desc: 'Negro & Ámbar', class: 'bg-[#0c0d13] border-nectar-gold/40 text-nectar-gold' },
                          { id: 'moss', name: 'Moss', desc: 'Verde Musgo', class: 'bg-[#122017] border-green-800 text-green-300' },
                          { id: 'cosmic', name: 'Cosmic', desc: 'Índigo Cósmico', class: 'bg-[#0c0a1a] border-purple-800 text-purple-300' },
                          { id: 'glow', name: 'Glow', desc: 'Cálido Miel', class: 'bg-[#1a130c] border-amber-700 text-amber-500' },
                          { id: 'mist', name: 'Mist', desc: 'Gris Pizarra', class: 'bg-[#181b22] border-cyan-800 text-cyan-400' },
                        ].map(t => (
                          <div
                            key={t.id}
                            onClick={() => setTemplateType(t.id)}
                            className={`p-3 rounded-2xl border cursor-pointer text-center transition-all hover:scale-102 flex flex-col justify-center items-center gap-1 ${t.class} ${templateType === t.id ? 'ring-2 ring-nectar-gold border-transparent' : 'opacity-65 hover:opacity-100'}`}
                          >
                            <span className="text-[10px] font-black uppercase tracking-wider">{t.name}</span>
                            <span className="text-[7px] font-bold uppercase tracking-widest opacity-60">{t.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[8px] text-white/60 uppercase tracking-widest font-black block">Tipografía Global de Sección</label>
                      <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold">
                        Sección activa seleccionada: <span className="text-nectar-gold underline italic">{editorActiveTab === 'title' ? 'Título' : editorActiveTab === 'footer' ? 'Pie' : 'Cuerpo'}</span>
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'serif', name: 'Estándar', css: 'font-serif', desc: 'Georgia Elegante' },
                          { id: 'playfair', name: 'Playfair', css: 'font-serif', desc: 'Clásico & Sofisticado' },
                          { id: 'cinzel', name: 'Cinzel', css: 'font-serif', desc: 'Romano Imperial' },
                          { id: 'garamond', name: 'Garamond', css: 'font-serif', desc: 'Elegancia Rústica' },
                          { id: 'montserrat', name: 'Montserrat', css: 'font-sans', desc: 'Minimalista Moderno' },
                          { id: 'pinyon', name: 'Pinyon Script', css: 'font-cursive', desc: 'Caligrafía Íntima' },
                        ].map(f => {
                          const currentActiveFont =
                            editorActiveTab === 'title' ? titleFontFamily :
                              editorActiveTab === 'footer' ? footerFontFamily :
                                fontFamily;

                          const handleFontSelect = () => {
                            if (editorActiveTab === 'title') setTitleFontFamily(f.id);
                            else if (editorActiveTab === 'footer') setFooterFontFamily(f.id);
                            else setFontFamily(f.id);
                          };

                          return (
                            <div
                              key={f.id}
                              onClick={handleFontSelect}
                              className={`p-3 rounded-2xl border cursor-pointer text-center transition-all hover:scale-102 flex flex-col justify-center items-center gap-1 ${currentActiveFont === f.id
                                ? 'bg-nectar-gold/10 border-nectar-gold text-nectar-gold ring-1 ring-nectar-gold'
                                : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <span className="text-xs font-black">{f.name}</span>
                              <span className="text-[7px] font-bold uppercase tracking-widest opacity-60">{f.desc}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-white/5 pt-4">
                      <label className="text-[8px] text-white/60 uppercase tracking-widest font-black block">Fondo del Correo</label>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/50 block">URL de Imagen de Fondo</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={bgImageUrl}
                            onChange={(e) => setBgImageUrl(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2 text-[9px] bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[6px] uppercase tracking-wider font-black text-white/40 block">Opacidad</label>
                            <input
                              type="number"
                              min="0.1"
                              max="1.0"
                              step="0.1"
                              value={bgOpacity}
                              onChange={(e) => setBgOpacity(e.target.value)}
                              className="w-full border rounded-xl px-2 py-1.5 text-[9px] bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[6px] uppercase tracking-wider font-black text-white/40 block">Saturación %</label>
                            <input
                              type="number"
                              min="0"
                              max="200"
                              value={bgSaturation}
                              onChange={(e) => setBgSaturation(e.target.value)}
                              className="w-full border rounded-xl px-2 py-1.5 text-[9px] bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[6px] uppercase tracking-wider font-black text-white/40 block">Posición</label>
                            <select
                              value={bgPosition}
                              onChange={(e) => setBgPosition(e.target.value)}
                              className="w-full border rounded-xl px-2 py-1.5 text-[9px] bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                            >
                              <option value="center">Centro</option>
                              <option value="top">Arriba</option>
                              <option value="bottom">Abajo</option>
                              <option value="left">Izquierda</option>
                              <option value="right">Derecha</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORY 3: COVER */}
                {settingsTab === 'cover' && (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Imagen de Portada (Cabecera)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-[9px] bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
                      <div className="space-y-1">
                        <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Ancho Portada</label>
                        <input
                          type="text"
                          value={campImageWidth}
                          onChange={(e) => setCampImageWidth(e.target.value)}
                          placeholder="100%"
                          className="w-full border rounded-xl px-3 py-2 text-[9px] bg-white/5 border-white/10 focus:outline-none text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Alineación</label>
                        <select
                          value={campImageAlign}
                          onChange={(e) => setCampImageAlign(e.target.value)}
                          className="w-full border rounded-xl px-3 py-2 text-[9px] bg-white/5 border-white/10 focus:outline-none text-white font-bold"
                        >
                          <option value="center">Centro</option>
                          <option value="left">Izquierda</option>
                          <option value="right">Derecha</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Bordes Redondeados</label>
                        <input
                          type="text"
                          value={campImageRadius}
                          onChange={(e) => setCampImageRadius(e.target.value)}
                          className="w-full border rounded-xl px-3 py-2 text-[9px] bg-white/5 border-white/10 focus:outline-none text-white font-mono"
                        />
                      </div>
                    </div>
                    {/* Viewport adjustments */}
                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <h4 className="text-[8px] font-black uppercase tracking-widest text-nectar-gold font-bold">Ajustes según pantalla:</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Ancho Tablet</label>
                          <input
                            type="text"
                            value={campImageWidthTablet}
                            onChange={(e) => setCampImageWidthTablet(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2 text-[9px] bg-white/5 border-white/10 text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Ancho Móvil</label>
                          <input
                            type="text"
                            value={campImageWidthMobile}
                            onChange={(e) => setCampImageWidthMobile(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2 text-[9px] bg-white/5 border-white/10 text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORY 4: SPACING & COLORS */}
                {settingsTab === 'sections' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-[8.5px] font-black uppercase tracking-widest text-nectar-gold pb-1.5 border-b border-white/5 font-bold">Dimensiones de Tarjeta</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Ancho Máximo</label>
                          <input
                            type="text"
                            value={campCardMaxWidthDesktop}
                            onChange={(e) => setCampCardMaxWidthDesktop(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2.5 text-[9px] bg-white/5 border-white/10 text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Padding Escritorio</label>
                          <input
                            type="text"
                            value={campCardPaddingDesktop}
                            onChange={(e) => setCampCardPaddingDesktop(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2.5 text-[9px] bg-white/5 border-white/10 text-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Padding Tablet</label>
                          <input
                            type="text"
                            value={campCardPaddingTablet}
                            onChange={(e) => setCampCardPaddingTablet(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2.5 text-[9px] bg-white/5 border-white/10 text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Padding Móvil</label>
                          <input
                            type="text"
                            value={campCardPaddingMobile}
                            onChange={(e) => setCampCardPaddingMobile(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2.5 text-[9px] bg-white/5 border-white/10 text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <h4 className="text-[8.5px] font-black uppercase tracking-widest text-nectar-gold pb-1.5 border-b border-white/5 font-bold">Personalización de Textos</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Tamaño Título (PC)</label>
                          <input type="text" value={campTitleFontSizeDesktop} onChange={(e) => setCampTitleFontSizeDesktop(e.target.value)} className="w-full border rounded-xl px-2 py-2 text-[9px] bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Título (Tab)</label>
                          <input type="text" value={campTitleFontSizeTablet} onChange={(e) => setCampTitleFontSizeTablet(e.target.value)} className="w-full border rounded-xl px-2 py-2 text-[9px] bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Título (Móvil)</label>
                          <input type="text" value={campTitleFontSizeMobile} onChange={(e) => setCampTitleFontSizeMobile(e.target.value)} className="w-full border rounded-xl px-2 py-2 text-[9px] bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Tamaño Cuerpo (PC)</label>
                          <input type="text" value={campBodyFontSizeDesktop} onChange={(e) => setCampBodyFontSizeDesktop(e.target.value)} className="w-full border rounded-xl px-2 py-2 text-[9px] bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Cuerpo (Tab)</label>
                          <input type="text" value={campBodyFontSizeTablet} onChange={(e) => setCampBodyFontSizeTablet(e.target.value)} className="w-full border rounded-xl px-2 py-2 text-[9px] bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Cuerpo (Móvil)</label>
                          <input type="text" value={campBodyFontSizeMobile} onChange={(e) => setCampBodyFontSizeMobile(e.target.value)} className="w-full border rounded-xl px-2 py-2 text-[9px] bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                      </div>
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Alineación del Cuerpo</label>
                        <select
                          value={campBodyAlignment}
                          onChange={(e) => setCampBodyAlignment(e.target.value)}
                          className="w-full border rounded-xl px-3 py-2 text-[9px] bg-white/5 border-white/10 text-white font-bold"
                        >
                          <option value="center">Centro</option>
                          <option value="left">Izquierda</option>
                          <option value="right">Derecha</option>
                          <option value="justify">Justificado</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <h4 className="text-[8.5px] font-black uppercase tracking-widest text-nectar-gold pb-1.5 border-b border-white/5 font-bold">Colores de Sección</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Color de Texto Título</label>
                          <input type="color" value={campTitleTextColor} onChange={(e) => setCampTitleTextColor(e.target.value)} className="w-full h-8 bg-transparent rounded cursor-pointer" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Color de Fondo Título</label>
                          <input type="color" value={campTitleBgColor} onChange={(e) => setCampTitleBgColor(e.target.value)} className="w-full h-8 bg-transparent rounded cursor-pointer" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Color de Texto Cuerpo</label>
                          <input type="color" value={campBodyTextColor} onChange={(e) => setCampBodyTextColor(e.target.value)} className="w-full h-8 bg-transparent rounded cursor-pointer" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Color de Fondo Cuerpo</label>
                          <input type="color" value={campBodyBgColor} onChange={(e) => setCampBodyBgColor(e.target.value)} className="w-full h-8 bg-transparent rounded cursor-pointer" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Color de Texto Footer</label>
                          <input type="color" value={campFooterTextColor} onChange={(e) => setCampFooterTextColor(e.target.value)} className="w-full h-8 bg-transparent rounded cursor-pointer" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Color de Fondo Footer</label>
                          <input type="color" value={campFooterBgColor} onChange={(e) => setCampFooterBgColor(e.target.value)} className="w-full h-8 bg-transparent rounded cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORY 5: BUTTONS */}
                {settingsTab === 'ctas' && (
                  <div className="space-y-6">
                    <div className="bg-white/[0.02] border border-white/5 p-5 rounded-[2rem] space-y-4">
                      <h4 className="text-[8.5px] font-black uppercase tracking-widest text-nectar-gold pb-1 border-b border-white/5 font-bold">
                        Llamado a la Acción (CTA Principal)
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Texto del Botón</label>
                          <input
                            type="text"
                            placeholder="ej: Registrarme"
                            value={ctaText}
                            onChange={(e) => setCtaText(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2.5 text-[9px] bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Enlace de Destino (URL)</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={ctaLink}
                            onChange={(e) => setCtaLink(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2.5 text-[9px] bg-white/5 border-white/10 focus:outline-none focus:border-nectar-gold text-white font-bold"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Alineación Botón</label>
                          <select
                            value={campCtaAlignment}
                            onChange={(e) => setCampCtaAlignment(e.target.value)}
                            className="w-full border rounded-xl px-3 py-2.5 text-[9px] bg-white/5 border-white/10 text-white font-bold"
                          >
                            <option value="center">Centro</option>
                            <option value="left">Izquierda</option>
                            <option value="right">Derecha</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Margen Superior</label>
                          <input type="text" value={campCtaMarginTop} onChange={(e) => setCampCtaMarginTop(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-[9px] bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase tracking-wider font-black text-white/40 block">Margen Inferior</label>
                          <input type="text" value={campCtaMarginBottom} onChange={(e) => setCampCtaMarginBottom(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-[9px] bg-white/5 border-white/10 text-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORY 6: LIBRARY */}
                {settingsTab === 'library' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest font-black">Biblioteca de Imágenes</span>
                      <label className="px-3.5 py-2 bg-nectar-gold/10 border border-nectar-gold/20 hover:bg-nectar-gold/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-nectar-gold flex items-center gap-1 cursor-pointer transition-all font-bold">
                        {libraryUploadLoading ? 'Subiendo...' : '+ Subir Imagen'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={libraryUploadLoading}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleTemplateImageUpload(file);
                          }}
                        />
                      </label>
                    </div>

                    {templateImages.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-white/10 rounded-[2rem] space-y-2">
                        <span className="text-2xl opacity-30 block">📁</span>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-black font-bold">Tu biblioteca está vacía</p>
                        <p className="text-[9px] text-white/30 max-w-xs mx-auto leading-normal">Sube imágenes para utilizarlas como portada, fondo o insertarlas directamente en el cuerpo del correo.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[46vh] overflow-y-auto pr-1 custom-scrollbar">
                        {templateImages.map((img: any) => (
                          <div key={img.id} className="group relative bg-white/5 border border-white/5 rounded-2xl overflow-hidden aspect-square flex flex-col justify-end">
                            <img src={img.image} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" alt="Library" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => insertImageAtCursor(img.image)}
                                className="w-full py-1.5 bg-nectar-gold hover:bg-yellow-500 text-background rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all font-bold"
                              >
                                Insertar en Editor
                              </button>
                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUseTemplateAsCover(img.image)}
                                  className="py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[7px] font-black uppercase tracking-wider transition-all font-bold"
                                >
                                  Portada
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUseTemplateAsBg(img.image)}
                                  className="py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[7px] font-black uppercase tracking-wider transition-all font-bold"
                                >
                                  Fondo
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleTemplateImageDelete(img.id)}
                                className="w-full py-1 bg-red-950/80 hover:bg-red-900 border border-red-800/40 text-red-300 rounded-lg text-[7px] font-black uppercase tracking-wider transition-all font-bold"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Column 2: Live Preview */}
            <div className={`flex flex-col h-full ${isPreviewExpanded ? 'w-full' : 'w-full lg:w-[480px]'} min-h-[480px] lg:max-h-[76vh] overflow-hidden bg-neutral-900 border border-white/5 rounded-3xl p-5 relative`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[7.5px] uppercase tracking-wider font-black text-white/50 block">Vista Previa (Estética Premium)</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                    className="px-2 py-1 bg-white/5 border border-white/10 text-[7px] text-white/50 hover:text-white rounded-lg font-black uppercase"
                  >
                    {isPreviewExpanded ? '⇐ Editar' : 'Expandir 🗖'}
                  </button>
                  <div className="flex bg-black/40 border border-white/15 rounded-lg p-0.5 gap-0.5">
                    {[
                      { id: 'desktop', label: '💻' },
                      { id: 'tablet', label: '📱' },
                      { id: 'mobile', label: '📞' }
                    ].map(vp => (
                      <button
                        key={vp.id}
                        type="button"
                        onClick={() => setPreviewViewport(vp.id as any)}
                        className={`px-2 py-0.5 rounded text-[8px] transition-all ${
                          previewViewport === vp.id ? 'bg-nectar-gold text-background font-bold' : 'text-white/40'
                        }`}
                      >
                        {vp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(() => {
                const themePreviewStyles = {
                  minimalist: {
                    bg: '#06070b',
                    cardBg: '#0c0d13',
                    text: '#F4F6F0',
                    border: `1px solid ${primaryColor}1a`,
                    accent: primaryColor
                  },
                  moss: {
                    bg: '#0b130e',
                    cardBg: '#122017',
                    text: '#f5fbf7',
                    border: '1px solid #2e4d38',
                    accent: '#82c99b'
                  },
                  cosmic: {
                    bg: '#05050f',
                    cardBg: '#0c0a1a',
                    text: '#F4F6F0',
                    border: '1px solid #4a154b',
                    accent: '#c084fc'
                  },
                  glow: {
                    bg: '#0f0b07',
                    cardBg: '#1a130c',
                    text: '#fffdfa',
                    border: '1px solid #d97706',
                    accent: '#f59e0b'
                  },
                  mist: {
                    bg: '#0f1115',
                    cardBg: '#181b22',
                    text: '#f3f4f6',
                    border: '1px solid #374151',
                    accent: '#06b6d4'
                  }
                };

                const selectedTheme = themePreviewStyles[templateType as keyof typeof themePreviewStyles] || themePreviewStyles.minimalist;

                let vpStyle: React.CSSProperties = {
                  width: '100%',
                  maxWidth: '100%',
                  height: '100%',
                  overflowY: 'auto',
                };
                if (previewViewport === 'tablet') {
                  vpStyle = { ...vpStyle, maxWidth: '380px', margin: '0 auto' };
                } else if (previewViewport === 'mobile') {
                  vpStyle = { ...vpStyle, maxWidth: '290px', margin: '0 auto' };
                }

                const fontStyleMap: Record<string, string> = {
                  serif: 'Georgia, serif',
                  playfair: "'Playfair Display', Georgia, serif",
                  cinzel: "'Cinzel', Georgia, serif",
                  garamond: "'Cormorant Garamond', 'Times New Roman', serif",
                  montserrat: "'Montserrat', Helvetica, Arial, sans-serif",
                  pinyon: "'Pinyon Script', cursive"
                };

                return (
                  <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl overflow-hidden p-2 flex items-center justify-center">
                    <div style={vpStyle} className="custom-scrollbar bg-[#0f0f0f] rounded-xl p-3 border border-white/5 transition-all">
                      <div
                        style={{
                          backgroundColor: selectedTheme.bg,
                          color: selectedTheme.text,
                          fontFamily: fontStyleMap[fontFamily] || 'serif',
                          padding: '24px 12px',
                          borderRadius: '16px',
                          backgroundImage: bgImageUrl ? `linear-gradient(rgba(0,0,0,${1 - parseFloat(bgOpacity)}), rgba(0,0,0,${1 - parseFloat(bgOpacity)})), url(${bgImageUrl})` : 'none',
                          backgroundPosition: bgPosition,
                          backgroundSize: 'cover',
                          border: selectedTheme.border
                        }}
                        className="space-y-4"
                      >
                        <div className="text-center pb-4 border-b border-white/10">
                          <span className="text-lg">👑</span>
                          <h1 className="text-xs font-black uppercase tracking-widest mt-1 text-white">Néctar Labs</h1>
                        </div>

                        {/* Cover Image */}
                        {imageUrl && (
                          <div style={{ textAlign: campImageAlign as any }} className="w-full">
                            <img
                              src={imageUrl}
                              style={{
                                width: previewViewport === 'mobile' ? campImageWidthMobile : previewViewport === 'tablet' ? campImageWidthTablet : campImageWidth,
                                borderRadius: campImageRadius,
                                border: selectedTheme.border,
                                display: 'inline-block'
                              }}
                              alt="Cover"
                            />
                          </div>
                        )}

                        {/* Title Section */}
                        <div
                          style={{
                            color: campTitleTextColor,
                            backgroundColor: campTitleBgColor,
                            padding: campTitlePadding,
                            borderRadius: campTitleRadius,
                            textAlign: 'center',
                            fontFamily: fontStyleMap[titleFontFamily] || 'serif'
                          }}
                        >
                          <h2
                            style={{
                              fontSize: previewViewport === 'mobile' ? campTitleFontSizeMobile : previewViewport === 'tablet' ? campTitleFontSizeTablet : campTitleFontSizeDesktop,
                              fontStyle: 'italic',
                              fontWeight: 'black',
                              lineHeight: '1.3'
                            }}
                          >
                            {emailTitle || campaignTitle || campaignSubject || 'Título del Boletín'}
                          </h2>
                        </div>

                        {/* Body Section */}
                        <div
                          style={{
                            color: campBodyTextColor || selectedTheme.text,
                            backgroundColor: campBodyBgColor,
                            padding: campBodyPadding,
                            borderRadius: campBodyRadius,
                            textAlign: (previewViewport === 'mobile' ? campBodyAlignmentMobile : previewViewport === 'tablet' ? campBodyAlignmentTablet : campBodyAlignment) as any
                          }}
                        >
                          <div
                            style={{
                              fontSize: previewViewport === 'mobile' ? campBodyFontSizeMobile : previewViewport === 'tablet' ? campBodyFontSizeTablet : campBodyFontSizeDesktop,
                              fontStyle: 'italic',
                              lineHeight: '1.8',
                              display: 'inline-block',
                              maxWidth: '90%',
                              textAlign: 'left'
                            }}
                            dangerouslySetInnerHTML={{ __html: campaignContent || '<p class="opacity-45 italic text-center">Escribe tu contenido para previsualizarlo aquí...</p>' }}
                          />
                        </div>

                        {/* Main CTA Button */}
                        {ctaText && (
                          <div style={{ textAlign: (previewViewport === 'mobile' ? campCtaAlignMobile : previewViewport === 'tablet' ? campCtaAlignTablet : campCtaAlignment) as any, marginTop: campCtaMarginTop, marginBottom: campCtaMarginBottom }}>
                            <a
                              href={ctaLink || '#'}
                              style={{
                                backgroundColor: selectedTheme.accent,
                                color: '#000000',
                                padding: '10px 20px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                display: 'inline-block',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                              }}
                              onClick={e => e.preventDefault()}
                            >
                              {ctaText}
                            </a>
                          </div>
                        )}

                        {/* Footer Section */}
                        <div
                          style={{
                            color: campFooterTextColor || 'rgba(255,255,255,0.4)',
                            backgroundColor: campFooterBgColor,
                            padding: campFooterPadding,
                            borderRadius: campFooterRadius,
                            fontFamily: fontStyleMap[footerFontFamily] || 'serif',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            paddingTop: '16px',
                            marginTop: '24px',
                            textAlign: 'center',
                            fontSize: '8px',
                            lineHeight: '1.6'
                          }}
                        >
                          {footerText ? (
                            <div dangerouslySetInnerHTML={{ __html: footerText }} />
                          ) : (
                            <p>© {new Date().getFullYear()} Néctar Labs. Todos los derechos reservados.</p>
                          )}
                          <p className="mt-1 font-bold text-nectar-gold hover:underline cursor-pointer">Desuscribirse</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-4 flex justify-end gap-2 mt-auto">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-white/80 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendCampaign}
                  disabled={isSendingCampaign || !campaignSubject.trim() || !campaignContent.trim()}
                  className="px-6 py-2 bg-nectar-gold text-background hover:bg-nectar-gold/90 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all font-bold shadow-md"
                >
                  {isSendingCampaign ? 'Enviando...' : '🚀 Enviar Campaña'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
