import type {LanguageCode, ToolId} from '../types';

export interface TranslationDictionary {
  appName: string;
  appShortName: string;
  slogan: string;
  navTools: string;
  navHistory: string;
  navSettings: string;
  searchPlaceholder: string;
  noSearchResults: string;
  clearSearch: string;
  heroTitle: string;
  heroDescription: string;
  exploreTools: string;
  selectFiles: string;
  privacyInd1: string;
  privacyInd2: string;
  privacyInd3: string;
  privacyInd4: string;
  allToolsHeading: string;
  allToolsSubheading: string;
  filterAll: string;
  filterConvert: string;
  filterOrganize: string;
  filterOptimize: string;
  openTool: string;
  backToTools: string;
  localPrivacyBanner: string;
  dropzoneTitle: string;
  dropzoneTitleMulti: string;
  dropzoneHint: string;
  browseFiles: string;
  supportedFormatsLabel: string;
  largeFileWarning: string;
  invalidFileError: string;
  corruptedFileError: string;
  noFilesSelected: string;
  removeFile: string;
  moveUp: string;
  moveDown: string;
  clearAll: string;
  processing: string;
  readyToDownload: string;
  downloadResult: string;
  downloadZip: string;
  resetWorkspace: string;
  totalPages: string;
  pageNumber: string;
  selectAll: string;
  deselectAll: string;
  selectedCount: string;
  previewLabel: string;
  loadingPreviews: string;
  offlineBanner: string;
  onlineReadyLabel: string;
  offlineReadyLabel: string;
  installApp: string;
  installOnIOS: string;
  iosInstallTitle: string;
  iosInstallStep1: string;
  iosInstallStep2: string;
  desktopInstallTitle: string;
  desktopInstallStep1: string;
  desktopInstallStep2: string;
  close: string;
  confirmTitle: string;
  confirmCancel: string;
  confirmProceed: string;
  themeLabel: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  languageLabel: string;
  languageEnglish: string;
  languageTamil: string;
  // Tool names & short descriptions
  tools: Record<
    ToolId,
    {
      name: string;
      shortDesc: string;
      actionLabel: string;
    }
  >;
  // Image to PDF
  imgPageSize: string;
  imgPageFit: string;
  imgOrientation: string;
  imgPortrait: string;
  imgLandscape: string;
  imgAuto: string;
  imgMargins: string;
  imgMarginNone: string;
  imgMarginSmall: string;
  imgMarginNormal: string;
  imgMarginLarge: string;
  imgFitMode: string;
  imgFitContain: string;
  imgFitCover: string;
  imgFitOriginal: string;
  imgReorderHint: string;
  // PDF to Word
  pdfToWordNoticeTitle: string;
  pdfToWordNoticeBody: string;
  pdfToWordScannedWarning: string;
  pdfToWordExtractedPreview: string;
  pdfToWordCharsExtracted: string;
  // Word to PDF
  wordToPdfPreviewTitle: string;
  wordToPdfNotice: string;
  wordToPdfConverting: string;
  // Merge PDF
  mergeOrderHint: string;
  mergeTotalFiles: string;
  mergeNeedTwo: string;
  // Split PDF
  splitModeLabel: string;
  splitModeIndividual: string;
  splitModeRanges: string;
  splitModeSelected: string;
  splitRangesInputLabel: string;
  splitRangesPlaceholder: string;
  splitRangesHelp: string;
  splitOutputCount: string;
  splitInvalidRanges: string;
  // Compress PDF
  compressModeLabel: string;
  compressModeLossless: string;
  compressModeLow: string;
  compressModeMedium: string;
  compressModeHigh: string;
  compressModeDescLossless: string;
  compressModeDescRaster: string;
  compressOriginalSize: string;
  compressNewSize: string;
  compressSavings: string;
  compressNoReductionTitle: string;
  compressNoReductionBody: string;
  // PDF to Image
  imgFormatLabel: string;
  imgQualityLabel: string;
  imgQualityLow: string;
  imgQualityMed: string;
  imgQualityHigh: string;
  imgScaleLabel: string;
  imgSelectPagesHint: string;
  imgDownloadSingle: string;
  // Rotate PDF
  rotateTargetLabel: string;
  rotateAllPages: string;
  rotateSelectedPages: string;
  rotateAngleLabel: string;
  rotateAngle90: string;
  rotateAngle180: string;
  rotateAngle270: string;
  rotateNoSelection: string;
  // Remove Pages
  removePagesHint: string;
  removeAllError: string;
  removeRemainingLabel: string;
  // Extract Pages
  extractPagesHint: string;
  extractRangeLabel: string;
  extractRangePlaceholder: string;
  // History
  historyTitle: string;
  historySubtitle: string;
  historySearchPlaceholder: string;
  historyFilterAll: string;
  historyClearAll: string;
  historyClearConfirm: string;
  historyEmptyTitle: string;
  historyEmptyDesc: string;
  historyColFile: string;
  historyColTool: string;
  historyColSize: string;
  historyColDate: string;
  historyColStatus: string;
  historyDeleteRecord: string;
  historyMetadataNote: string;
  statusSuccess: string;
  statusWarning: string;
  statusError: string;
  // Settings
  settingsTitle: string;
  settingsSubtitle: string;
  settingsAppearance: string;
  settingsDataTitle: string;
  settingsClearHistoryBtn: string;
  settingsClearHistoryDesc: string;
  settingsClearCacheBtn: string;
  settingsClearCacheDesc: string;
  settingsClearCacheConfirm: string;
  settingsCacheCleared: string;
  settingsPrivacyTitle: string;
  settingsPrivacyBody: string;
  settingsAboutTitle: string;
  settingsAboutBody: string;
  settingsVersionLabel: string;
  settingsInstalledStatus: string;
  settingsNotInstalledStatus: string;
  // Quick File Router modal
  quickSelectTitle: string;
  quickSelectSubtitle: string;
  quickSelectChooseTool: string;
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  en: {
    appName: 'Offline Document Converter',
    appShortName: 'DocConvert',
    slogan: 'Convert Documents. Keep Your Privacy. Work Offline.',
    navTools: 'Tools',
    navHistory: 'History',
    navSettings: 'Settings',
    searchPlaceholder: 'Search document tools...',
    noSearchResults: 'No tools match your search.',
    clearSearch: 'Clear search',
    heroTitle: 'Your Documents. Your Device. Your Privacy.',
    heroDescription:
      'Convert, edit, merge, and organize documents securely without uploading files or requiring an internet connection.',
    exploreTools: 'Explore Tools',
    selectFiles: 'Select Files',
    privacyInd1: '100% Local Processing',
    privacyInd2: 'Offline Ready',
    privacyInd3: 'No File Uploads',
    privacyInd4: 'Free to Use',
    allToolsHeading: 'Document Tools',
    allToolsSubheading: 'Choose a workspace to convert, combine, or edit files directly inside your browser.',
    filterAll: 'All Tools',
    filterConvert: 'Convert',
    filterOrganize: 'Organize',
    filterOptimize: 'Optimize',
    openTool: 'Open Tool',
    backToTools: 'Back to All Tools',
    localPrivacyBanner: 'Your files are processed locally on this device. They are never uploaded to a server.',
    dropzoneTitle: 'Drop your file here, or click to browse',
    dropzoneTitleMulti: 'Drop your files here, or click to browse',
    dropzoneHint: 'Processing runs entirely in browser memory with zero network transfer.',
    browseFiles: 'Browse Files',
    supportedFormatsLabel: 'Supported formats',
    largeFileWarning: 'Large file detected (> 50 MB). Processing happens locally and may take a few moments depending on device memory.',
    invalidFileError: 'Unsupported or invalid file format. Please verify the file type.',
    corruptedFileError: 'Could not read this file. It may be corrupted, encrypted with a password, or unsupported.',
    noFilesSelected: 'Please select at least one file to continue.',
    removeFile: 'Remove',
    moveUp: 'Move up',
    moveDown: 'Move down',
    clearAll: 'Clear all',
    processing: 'Processing locally...',
    readyToDownload: 'Conversion complete and ready to download.',
    downloadResult: 'Download File',
    downloadZip: 'Download All (ZIP)',
    resetWorkspace: 'Start New File',
    totalPages: 'Total pages',
    pageNumber: 'Page',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    selectedCount: 'Selected',
    previewLabel: 'Preview',
    loadingPreviews: 'Rendering page previews locally...',
    offlineBanner: 'Offline Mode — Running 100% from local device cache.',
    onlineReadyLabel: 'Offline Cache Ready',
    offlineReadyLabel: 'Offline Mode Active',
    installApp: 'Install App',
    installOnIOS: 'Install on iOS',
    iosInstallTitle: 'Install on iPhone or iPad',
    iosInstallStep1: 'Tap the Share icon in your Safari toolbar.',
    iosInstallStep2: 'Scroll down and tap "Add to Home Screen".',
    desktopInstallTitle: 'Install Offline Document Converter',
    desktopInstallStep1: 'Open the browser menu or look for the Install icon in the address bar.',
    desktopInstallStep2: 'Click "Install" or "Add to Home Screen" to use the app offline anytime.',
    close: 'Close',
    confirmTitle: 'Confirm Action',
    confirmCancel: 'Cancel',
    confirmProceed: 'Confirm',
    themeLabel: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    languageLabel: 'Language',
    languageEnglish: 'English',
    languageTamil: 'தமிழ் (Tamil)',
    tools: {
      'image-to-pdf': {
        name: 'Image to PDF',
        shortDesc: 'Combine JPG, PNG, and WEBP images into a customizable PDF document.',
        actionLabel: 'Create PDF',
      },
      'pdf-to-word': {
        name: 'PDF to Word',
        shortDesc: 'Extract structured text and paragraphs from PDFs into an editable DOCX file.',
        actionLabel: 'Convert to DOCX',
      },
      'word-to-pdf': {
        name: 'Word to PDF',
        shortDesc: 'Turn DOCX documents into clean, multi-page PDFs with headings and images.',
        actionLabel: 'Convert to PDF',
      },
      'merge-pdf': {
        name: 'Merge PDF',
        shortDesc: 'Combine multiple PDF documents in any order into one unified file.',
        actionLabel: 'Merge PDFs',
      },
      'split-pdf': {
        name: 'Split PDF',
        shortDesc: 'Divide a PDF by custom page ranges, individual pages, or selected sheets.',
        actionLabel: 'Split PDF',
      },
      'compress-pdf': {
        name: 'Compress PDF',
        shortDesc: 'Reduce PDF file size locally using structure optimization or image downsampling.',
        actionLabel: 'Compress PDF',
      },
      'pdf-to-image': {
        name: 'PDF to Image',
        shortDesc: 'Export PDF pages as crisp PNG or JPG images individually or as a ZIP.',
        actionLabel: 'Export Images',
      },
      'rotate-pdf': {
        name: 'Rotate PDF',
        shortDesc: 'Rotate specific pages or an entire PDF by 90°, 180°, or 270°.',
        actionLabel: 'Apply Rotation',
      },
      'remove-pages': {
        name: 'Remove PDF Pages',
        shortDesc: 'Visually pick unwanted pages from thumbnails and export a clean PDF.',
        actionLabel: 'Remove Selected Pages',
      },
      'extract-pages': {
        name: 'Extract PDF Pages',
        shortDesc: 'Select specific pages or ranges to save as a brand-new PDF document.',
        actionLabel: 'Extract Pages',
      },
    },
    imgPageSize: 'Page Size',
    imgPageFit: 'Fit to Image',
    imgOrientation: 'Orientation',
    imgPortrait: 'Portrait',
    imgLandscape: 'Landscape',
    imgAuto: 'Auto per Image',
    imgMargins: 'Margins',
    imgMarginNone: 'None (0 mm)',
    imgMarginSmall: 'Small (10 mm)',
    imgMarginNormal: 'Normal (20 mm)',
    imgMarginLarge: 'Large (30 mm)',
    imgFitMode: 'Image Fit',
    imgFitContain: 'Fit Inside Page',
    imgFitCover: 'Fill Page (Crop)',
    imgFitOriginal: 'Center Original',
    imgReorderHint: 'Use the arrows to arrange the page order before creating your PDF.',
    pdfToWordNoticeTitle: 'Local Text Reconstruction',
    pdfToWordNoticeBody:
      'Browser-based PDF-to-Word preserves text, detected headings, paragraphs, and basic bold/italic styles. Complex multi-column layouts, vector diagrams, and embedded tables cannot be reproduced identically without server OCR.',
    pdfToWordScannedWarning:
      'Very little selectable text was detected. This PDF may be scanned or image-based—local extraction only reads embedded text layers.',
    pdfToWordExtractedPreview: 'Extracted Document Preview',
    pdfToWordCharsExtracted: 'characters extracted',
    wordToPdfPreviewTitle: 'Document Content Preview',
    wordToPdfNotice:
      'Headings, paragraphs, lists, tables, and embedded images are rendered locally into paginated A4 PDF pages.',
    wordToPdfConverting: 'Rendering formatted document pages...',
    mergeOrderHint: 'Drag or use arrows to reorder PDFs. Pages are combined from top to bottom.',
    mergeTotalFiles: 'files ready',
    mergeNeedTwo: 'Upload at least 2 PDF files to merge them.',
    splitModeLabel: 'Split Method',
    splitModeIndividual: 'Every page as separate PDF',
    splitModeRanges: 'Custom page ranges',
    splitModeSelected: 'Select specific pages',
    splitRangesInputLabel: 'Page ranges (comma-separated)',
    splitRangesPlaceholder: 'e.g. 1-5, 6-10, 2, 4, 6',
    splitRangesHelp: 'Each comma-separated range or page number creates a separate PDF file (e.g. "1-5, 6-10").',
    splitOutputCount: 'Output documents',
    splitInvalidRanges: 'Please enter valid page numbers or ranges within total page count.',
    compressModeLabel: 'Compression Level',
    compressModeLossless: 'Lossless Structure Cleanup',
    compressModeLow: 'Low Compression (High Quality)',
    compressModeMedium: 'Medium Compression (Balanced)',
    compressModeHigh: 'High Compression (Smallest Size)',
    compressModeDescLossless: 'Strips redundant metadata and optimizes PDF streams without altering image pixels. Best for text-heavy PDFs.',
    compressModeDescRaster: 'Re-encodes rendered pages as optimized JPEG streams at calibrated DPI. Best for image-heavy or scanned PDFs.',
    compressOriginalSize: 'Original Size',
    compressNewSize: 'Compressed Size',
    compressSavings: 'Size Reduction',
    compressNoReductionTitle: 'File Already Optimized',
    compressNoReductionBody:
      'This PDF could not be reduced further with the selected setting (output would be equal or larger). Try a higher compression level for image-heavy pages, or keep your original file.',
    imgFormatLabel: 'Image Format',
    imgQualityLabel: 'Quality',
    imgQualityLow: 'Standard (65%)',
    imgQualityMed: 'Balanced (82%)',
    imgQualityHigh: 'High (95%)',
    imgScaleLabel: 'Resolution Scale',
    imgSelectPagesHint: 'Click pages below to choose which pages to export, or export all.',
    imgDownloadSingle: 'Save Image',
    rotateTargetLabel: 'Apply Rotation To',
    rotateAllPages: 'All Pages',
    rotateSelectedPages: 'Selected Pages Only',
    rotateAngleLabel: 'Clockwise Rotation',
    rotateAngle90: '90° Right',
    rotateAngle180: '180° Flip',
    rotateAngle270: '270° (90° Left)',
    rotateNoSelection: 'Select at least one page to rotate, or switch to "All Pages".',
    removePagesHint: 'Click any page thumbnail below to mark it for removal.',
    removeAllError: 'You cannot remove every page. At least 1 page must remain.',
    removeRemainingLabel: 'Pages remaining',
    extractPagesHint: 'Select page thumbnails or type page numbers/ranges to extract into a new PDF.',
    extractRangeLabel: 'Or enter pages / ranges',
    extractRangePlaceholder: 'e.g. 1, 3-5, 8',
    historyTitle: 'Local Conversion History',
    historySubtitle: 'Stored strictly in your browser IndexedDB. Only file metadata is saved—never document contents.',
    historySearchPlaceholder: 'Search by file name or tool...',
    historyFilterAll: 'All Conversions',
    historyClearAll: 'Clear History',
    historyClearConfirm: 'Remove all conversion history records from this device? Your downloaded files are not affected.',
    historyEmptyTitle: 'No conversions recorded yet',
    historyEmptyDesc: 'When you convert, merge, or edit a document locally, its metadata summary will appear here.',
    historyColFile: 'File',
    historyColTool: 'Operation',
    historyColSize: 'Size',
    historyColDate: 'Date & Time',
    historyColStatus: 'Status',
    historyDeleteRecord: 'Delete record',
    historyMetadataNote: 'Metadata only · Contents never stored',
    statusSuccess: 'Completed',
    statusWarning: 'Completed with note',
    statusError: 'Failed',
    settingsTitle: 'Settings & Offline Storage',
    settingsSubtitle: 'Customize appearance, language, and manage local browser storage.',
    settingsAppearance: 'Preferences',
    settingsDataTitle: 'Local Storage & Cache',
    settingsClearHistoryBtn: 'Clear Conversion History',
    settingsClearHistoryDesc: 'Deletes all saved file metadata entries from IndexedDB on this device.',
    settingsClearCacheBtn: 'Clear Cached App Data',
    settingsClearCacheDesc: 'Clears offline Service Worker caches and resets local preferences.',
    settingsClearCacheConfirm: 'Clear cached offline application data? You will need an internet connection once to reload cached assets.',
    settingsCacheCleared: 'Cached application data cleared.',
    settingsPrivacyTitle: 'Privacy & Security Guarantee',
    settingsPrivacyBody:
      'Offline Document Converter executes every PDF, Word, and image operation directly in your device RAM via WebAssembly and JavaScript. No file is ever transmitted over the network, no user account exists, and no third-party analytics or external document APIs are used.',
    settingsAboutTitle: 'About Offline Document Converter',
    settingsAboutBody:
      'Built as an installable Progressive Web App with bundled pdf-lib, jsPDF, pdf.js, mammoth.js, docx, and JSZip engines for uninterrupted offline productivity.',
    settingsVersionLabel: 'App Version',
    settingsInstalledStatus: 'Installed as Standalone App',
    settingsNotInstalledStatus: 'Running in Browser',
    quickSelectTitle: 'Choose a Tool for Your File',
    quickSelectSubtitle: 'Select an operation to open directly with your chosen file.',
    quickSelectChooseTool: 'Open in',
  },
  ta: {
    appName: 'ஆஃப்லைன் ஆவண மாற்றி',
    appShortName: 'ஆவண மாற்றி',
    slogan: 'ஆவணங்களை மாற்றுங்கள். தனியுரிமையைக் காக்குங்கள். இணையமின்றி செயல்படுங்கள்.',
    navTools: 'கருவிகள்',
    navHistory: 'வரலாறு',
    navSettings: 'அமைப்புகள்',
    searchPlaceholder: 'ஆவண கருவிகளைத் தேடுங்கள்...',
    noSearchResults: 'உங்கள் தேடலுக்குப் பொருந்தும் கருவிகள் இல்லை.',
    clearSearch: 'தேடலை அழி',
    heroTitle: 'உங்கள் ஆவணங்கள். உங்கள் சாதனம். உங்கள் தனியுரிமை.',
    heroDescription:
      'கோப்புகளை இணையத்தில் பதிவேற்றாமல் அல்லது இணைய இணைப்பு இல்லாமல் உங்கள் உலாவியிலேயே ஆவணங்களைப் பாதுகாப்பாக மாற்றவும், இணைக்கவும் மற்றும் ஒழுங்கமைக்கவும்.',
    exploreTools: 'கருவிகளைப் பார்க்க',
    selectFiles: 'கோப்புகளைத் தேர்ந்தெடு',
    privacyInd1: '100% உள்ளூர் செயலாக்கம்',
    privacyInd2: 'ஆஃப்லைன் தயார்நிலை',
    privacyInd3: 'பதிவேற்றம் இல்லை',
    privacyInd4: 'இலவச பயன்பாடு',
    allToolsHeading: 'ஆவணக் கருவிகள்',
    allToolsSubheading: 'உங்கள் உலாவியிலேயே கோப்புகளை மாற்ற, இணைக்க அல்லது திருத்த ஒரு கருவியைத் தேர்ந்தெடுக்கவும்.',
    filterAll: 'அனைத்து கருவிகள்',
    filterConvert: 'மாற்றுதல்',
    filterOrganize: 'ஒழுங்கமைத்தல்',
    filterOptimize: 'சீரமைத்தல்',
    openTool: 'கருவியைத் திற',
    backToTools: 'அனைத்து கருவிகளுக்குத் திரும்பு',
    localPrivacyBanner: 'உங்கள் கோப்புகள் இந்தச் சாதனத்தில் மட்டுமே செயலாக்கப்படுகின்றன. அவை ஒருபோதும் சேவையகத்திற்கு பதிவேற்றப்படுவதில்லை.',
    dropzoneTitle: 'உங்கள் கோப்பை இங்கே இழுத்துப் போடவும் அல்லது கிளிக் செய்யவும்',
    dropzoneTitleMulti: 'உங்கள் கோப்புகளை இங்கே இழுத்துப் போடவும் அல்லது கிளிக் செய்யவும்',
    dropzoneHint: 'அனைத்து செயலாக்கமும் இணையப் பரிமாற்றமின்றி உலாவி நினைவகத்தில் நடைபெறுகிறது.',
    browseFiles: 'கோப்புகளைத் தேர்ந்தெடு',
    supportedFormatsLabel: 'ஆதரிக்கப்படும் வடிவங்கள்',
    largeFileWarning: 'பெரிய கோப்பு (> 50 MB) கண்டறியப்பட்டது. உள்ளூர் செயலாக்கத்திற்கு சாதனத்தின் நினைவகத்தைப் பொறுத்து சிறிது நேரம் ஆகலாம்.',
    invalidFileError: 'ஆதரிக்கப்படாத அல்லது தவறான கோப்பு வடிவம். கோப்பு வகையைச் சரிபார்க்கவும்.',
    corruptedFileError: 'இந்தக் கோப்பைப் படிக்க முடியவில்லை. இது சேதமடைந்திருக்கலாம் அல்லது கடவுச்சொல் மூலம் பூட்டப்பட்டிருக்கலாம்.',
    noFilesSelected: 'தொடர குறைந்தபட்சம் ஒரு கோப்பைத் தேர்ந்தெடுக்கவும்.',
    removeFile: 'நீக்கு',
    moveUp: 'மேலே நகர்த்து',
    moveDown: 'கீழே நகர்த்து',
    clearAll: 'அனைத்தையும் அழி',
    processing: 'உள்ளூரில் செயலாக்கப்படுகிறது...',
    readyToDownload: 'மாற்றம் முடிந்தது, பதிவிறக்கத்திற்குத் தயார்.',
    downloadResult: 'கோப்பைப் பதிவிறக்கு',
    downloadZip: 'அனைத்தையும் பதிவிறக்கு (ZIP)',
    resetWorkspace: 'புதிய கோப்பைத் தொடங்கு',
    totalPages: 'மொத்த பக்கங்கள்',
    pageNumber: 'பக்கம்',
    selectAll: 'அனைத்தையும் தேர்ந்தெடு',
    deselectAll: 'தேர்வை நீக்கு',
    selectedCount: 'தேர்ந்தெடுக்கப்பட்டவை',
    previewLabel: 'முன்னோட்டம்',
    loadingPreviews: 'பக்க முன்னோட்டங்கள் தயாராகின்றன...',
    offlineBanner: 'ஆஃப்லைன் பயன்முறை — உள்ளூர் தற்காலிக சேமிப்பிலிருந்து 100% இயங்குகிறது.',
    onlineReadyLabel: 'ஆஃப்லைன் சேமிப்பு தயார்',
    offlineReadyLabel: 'ஆஃப்லைன் பயன்முறை செயலில்',
    installApp: 'செயலியை நிறுவு',
    installOnIOS: 'iOS-ல் நிறுவு',
    iosInstallTitle: 'iPhone அல்லது iPad-ல் நிறுவவும்',
    iosInstallStep1: 'Safari கருவிப்பட்டியில் உள்ள Share (பகிர்) பொத்தானைத் தட்டவும்.',
    iosInstallStep2: 'கீழே உருட்டி "Add to Home Screen" என்பதைத் தட்டவும்.',
    desktopInstallTitle: 'ஆஃப்லைன் ஆவண மாற்றியை நிறுவவும்',
    desktopInstallStep1: 'உலாவி மெனுவைத் திறக்கவும் அல்லது முகவரிப் பட்டியில் உள்ள Install ஐகானைப் பார்க்கவும்.',
    desktopInstallStep2: 'இணையமின்றி பயன்படுத்த "Install" அல்லது "Add to Home Screen" என்பதைத் தேர்ந்தெடுக்கவும்.',
    close: 'மூடு',
    confirmTitle: 'செயலை உறுதிப்படுத்து',
    confirmCancel: 'ரத்து செய்',
    confirmProceed: 'உறுதிப்படுத்து',
    themeLabel: 'தோற்றம்',
    themeLight: 'ஒளி (Light)',
    themeDark: 'இருள் (Dark)',
    themeSystem: 'கணினி (System)',
    languageLabel: 'மொழி',
    languageEnglish: 'English',
    languageTamil: 'தமிழ் (Tamil)',
    tools: {
      'image-to-pdf': {
        name: 'படம் → PDF',
        shortDesc: 'JPG, PNG மற்றும் WEBP படங்களை விருப்பமான PDF ஆவணமாக மாற்றவும்.',
        actionLabel: 'PDF உருவாக்கு',
      },
      'pdf-to-word': {
        name: 'PDF → Word',
        shortDesc: 'PDF-லிருந்து உரை மற்றும் பத்திகளைப் பிரித்தெடுத்து திருத்தக்கூடிய DOCX கோப்பாக மாற்றவும்.',
        actionLabel: 'DOCX ஆக மாற்று',
      },
      'word-to-pdf': {
        name: 'Word → PDF',
        shortDesc: 'DOCX ஆவணங்களைத் தலைப்புகள் மற்றும் படங்களுடன் சுத்தமான PDF கோப்பாக மாற்றவும்.',
        actionLabel: 'PDF ஆக மாற்று',
      },
      'merge-pdf': {
        name: 'PDF இணைப்பு',
        shortDesc: 'பல PDF கோப்புகளை நீங்கள் விரும்பும் வரிசையில் ஒரே PDF ஆக இணைக்கவும்.',
        actionLabel: 'PDF-களை இணை',
      },
      'split-pdf': {
        name: 'PDF பிரிப்பு',
        shortDesc: 'தனிப்பயன் பக்க வரம்புகள், தனிப் பக்கங்கள் அல்லது தேர்ந்தெடுத்த பக்கங்களாகப் பிரிக்கவும்.',
        actionLabel: 'PDF-ஐப் பிரி',
      },
      'compress-pdf': {
        name: 'PDF சுருக்கம்',
        shortDesc: 'அமைப்பு மேம்படுத்தல் அல்லது பட சுருக்கம் மூலம் PDF கோப்பு அளவைக் குறைக்கவும்.',
        actionLabel: 'PDF-ஐச் சுருக்கு',
      },
      'pdf-to-image': {
        name: 'PDF → படம்',
        shortDesc: 'PDF பக்கங்களைத் தெளிவான PNG அல்லது JPG படங்களாகவோ அல்லது ZIP ஆகவோ சேமிக்கவும்.',
        actionLabel: 'படங்களாக மாற்று',
      },
      'rotate-pdf': {
        name: 'PDF சுழற்று',
        shortDesc: 'தேர்ந்தெடுத்த பக்கங்கள் அல்லது முழு PDF-ஐ 90°, 180°, அல்லது 270° சுழற்றவும்.',
        actionLabel: 'சுழற்றலைப் பயன்படுத்து',
      },
      'remove-pages': {
        name: 'பக்கங்களை நீக்கு',
        shortDesc: 'சிறுபடங்களிலிருந்து தேவையற்ற பக்கங்களைத் தேர்ந்தெடுத்து நீக்கி புதிய PDF பெறவும்.',
        actionLabel: 'தேர்ந்தெடுத்த பக்கங்களை நீக்கு',
      },
      'extract-pages': {
        name: 'பக்கங்களைப் பிரித்தெடு',
        shortDesc: 'குறிப்பிட்ட பக்கங்கள் அல்லது வரம்புகளைத் தேர்ந்தெடுத்து புதிய PDF கோப்பாகச் சேமிக்கவும்.',
        actionLabel: 'பக்கங்களைப் பிரித்தெடு',
      },
    },
    imgPageSize: 'பக்க அளவு',
    imgPageFit: 'படத்தின் அளவு',
    imgOrientation: 'திசை',
    imgPortrait: 'செங்குத்து (Portrait)',
    imgLandscape: 'கிடைமட்டம் (Landscape)',
    imgAuto: 'படத்திற்கு ஏற்ப',
    imgMargins: 'விளிம்புகள் (Margins)',
    imgMarginNone: 'இல்லை (0 mm)',
    imgMarginSmall: 'சிறியது (10 mm)',
    imgMarginNormal: 'சாதாரணம் (20 mm)',
    imgMarginLarge: 'பெரியது (30 mm)',
    imgFitMode: 'பட பொருத்தம்',
    imgFitContain: 'பக்கத்திற்குள் பொருத்து',
    imgFitCover: 'பக்கத்தை நிரப்பு',
    imgFitOriginal: 'மையத்தில் அசல் அளவு',
    imgReorderHint: 'PDF உருவாக்கும் முன் பக்க வரிசையை அமைக்க அம்புக்குறிகளைப் பயன்படுத்தவும்.',
    pdfToWordNoticeTitle: 'உள்ளூர் உரை மறுகட்டமைப்பு',
    pdfToWordNoticeBody:
      'உலாவி அடிப்படையிலான PDF-இலிருந்து Word மாற்றம் உரை, தலைப்புகள், பத்திகள் மற்றும் அடிப்படை தடித்த/சாய்வு எழுத்து வடிவங்களைப் பாதுகாக்கிறது. சிக்கலான பல-நெடுவரிசை அமைப்புகள் மற்றும் வரைபடங்களை சேவையக OCR இல்லாமல் துல்லியமாக மாற்ற முடியாது.',
    pdfToWordScannedWarning:
      'மிகக் குறைந்த உரையே கண்டறியப்பட்டது. இது ஸ்கேன் செய்யப்பட்ட PDF ஆக இருக்கலாம்—உள்ளூர் செயலாக்கம் உள்ளமைக்கப்பட்ட உரை அடுக்குகளை மட்டுமே படிக்கும்.',
    pdfToWordExtractedPreview: 'பிரித்தெடுக்கப்பட்ட உரை முன்னோட்டம்',
    pdfToWordCharsExtracted: 'எழுத்துக்கள் பிரித்தெடுக்கப்பட்டன',
    wordToPdfPreviewTitle: 'ஆவண உள்ளடக்க முன்னோட்டம்',
    wordToPdfNotice:
      'தலைப்புகள், பத்திகள், பட்டியல்கள், அட்டவணைகள் மற்றும் படங்கள் உள்ளூரில் A4 PDF பக்கங்களாக மாற்றப்படுகின்றன.',
    wordToPdfConverting: 'ஆவணப் பக்கங்கள் உருவாக்கப்படுகின்றன...',
    mergeOrderHint: 'PDF வரிசையை மாற்ற அம்புக்குறிகளைப் பயன்படுத்தவும். மேலிருந்து கீழாக இணைக்கப்படும்.',
    mergeTotalFiles: 'கோப்புகள் தயார்',
    mergeNeedTwo: 'இணைக்க குறைந்தபட்சம் 2 PDF கோப்புகளைப் பதிவேற்றவும்.',
    splitModeLabel: 'பிரிக்கும் முறை',
    splitModeIndividual: 'ஒவ்வொரு பக்கமும் தனி PDF ஆக',
    splitModeRanges: 'தனிப்பயன் பக்க வரம்புகள்',
    splitModeSelected: 'குறிப்பிட்ட பக்கங்களைத் தேர்ந்தெடு',
    splitRangesInputLabel: 'பக்க வரம்புகள் (காற்புள்ளியால் பிரிக்கவும்)',
    splitRangesPlaceholder: 'எ.கா. 1-5, 6-10, 2, 4, 6',
    splitRangesHelp: 'ஒவ்வொரு வரம்பும் அல்லது பக்க எண்ணும் தனி PDF கோப்பை உருவாக்கும் (எ.கா. "1-5, 6-10").',
    splitOutputCount: 'வெளியீட்டு ஆவணங்கள்',
    splitInvalidRanges: 'மொத்த பக்க எண்ணிக்கைக்குள் சரியான பக்க எண்கள் அல்லது வரம்புகளை உள்ளிடவும்.',
    compressModeLabel: 'சுருக்க நிலை',
    compressModeLossless: 'இழப்பற்ற கட்டமைப்பு சுத்தம்',
    compressModeLow: 'குறைந்த சுருக்கம் (உயர் தரம்)',
    compressModeMedium: 'நடுத்தர சுருக்கம் (சமநிலை)',
    compressModeHigh: 'அதிக சுருக்கம் (மிகச் சிறிய அளவு)',
    compressModeDescLossless: 'படத் தரத்தை மாற்றாமல் தேவையற்ற மெட்டாடேட்டாவை நீக்குகிறது. உரை சார்ந்த PDF-களுக்குச் சிறந்தது.',
    compressModeDescRaster: 'பக்கங்களை மேம்படுத்தப்பட்ட JPEG படங்களாக மறு-குறியாக்கம் செய்கிறது. படங்கள் நிறைந்த PDF-களுக்குச் சிறந்தது.',
    compressOriginalSize: 'அசல் அளவு',
    compressNewSize: 'சுருக்கப்பட்ட அளவு',
    compressSavings: 'அளவு குறைப்பு',
    compressNoReductionTitle: 'கோப்பு ஏற்கனவே சீரமைக்கப்பட்டுள்ளது',
    compressNoReductionBody:
      'தேர்ந்தெடுத்த அமைப்பில் இந்த PDF அளவைக் குறைக்க முடியவில்லை (வெளியீடு சமமாகவோ பெரியதாகவோ உள்ளது). படங்கள் அதிகம் இருந்தால் அதிக சுருக்க நிலையை முயற்சிக்கவும்.',
    imgFormatLabel: 'பட வடிவம்',
    imgQualityLabel: 'தரம்',
    imgQualityLow: 'சாதாரணம் (65%)',
    imgQualityMed: 'சமநிலை (82%)',
    imgQualityHigh: 'உயர் தரம் (95%)',
    imgScaleLabel: 'தெளிவுத்திறன் அளவு',
    imgSelectPagesHint: 'பிரித்தெடுக்க வேண்டிய பக்கங்களைத் தேர்ந்தெடுக்கவும் அல்லது அனைத்தையும் மாற்றவும்.',
    imgDownloadSingle: 'படத்தைச் சேமி',
    rotateTargetLabel: 'சுழற்றலைப் பயன்படுத்து',
    rotateAllPages: 'அனைத்து பக்கங்கள்',
    rotateSelectedPages: 'தேர்ந்தெடுத்த பக்கங்கள் மட்டும்',
    rotateAngleLabel: 'வலஞ்சுழி சுழற்றல்',
    rotateAngle90: '90° வலது',
    rotateAngle180: '180° தலைகீழ்',
    rotateAngle270: '270° (90° இடது)',
    rotateNoSelection: 'சுழற்ற குறைந்தபட்சம் ஒரு பக்கத்தைத் தேர்ந்தெடுக்கவும் அல்லது "அனைத்து பக்கங்கள்" என்பதைத் தேர்ந்தெடுக்கவும்.',
    removePagesHint: 'நீக்க வேண்டிய பக்கங்களின் சிறுபடங்களைக் கிளிக் செய்யவும்.',
    removeAllError: 'அனைத்து பக்கங்களையும் நீக்க முடியாது. குறைந்தபட்சம் 1 பக்கம் இருக்க வேண்டும்.',
    removeRemainingLabel: 'மீதமுள்ள பக்கங்கள்',
    extractPagesHint: 'புதிய PDF-ல் சேமிக்க பக்கங்களைத் தேர்ந்தெடுக்கவும் அல்லது எண்களை உள்ளிடவும்.',
    extractRangeLabel: 'அல்லது பக்கங்கள் / வரம்புகளை உள்ளிடவும்',
    extractRangePlaceholder: 'எ.கா. 1, 3-5, 8',
    historyTitle: 'உள்ளூர் மாற்ற வரலாறு',
    historySubtitle: 'உங்கள் உலாவியின் IndexedDB-ல் மட்டுமே சேமிக்கப்படுகிறது. கோப்பு விவரங்கள் மட்டுமே சேமிக்கப்படும்—உள்ளடக்கம் அல்ல.',
    historySearchPlaceholder: 'கோப்பு பெயர் அல்லது கருவியைத் தேடு...',
    historyFilterAll: 'அனைத்து மாற்றங்கள்',
    historyClearAll: 'வரலாற்றை அழி',
    historyClearConfirm: 'இந்தச் சாதனத்தில் உள்ள அனைத்து மாற்ற வரலாற்றுப் பதிவுகளையும் நீக்கவா? பதிவிறக்கிய கோப்புகள் பாதிக்கப்படாது.',
    historyEmptyTitle: 'இதுவரை மாற்றங்கள் எதுவும் இல்லை',
    historyEmptyDesc: 'நீங்கள் ஆவணங்களை மாற்றும்போது அல்லது திருத்தும்போது, அவற்றின் சுருக்கம் இங்கே தோன்றும்.',
    historyColFile: 'கோப்பு',
    historyColTool: 'செயல்',
    historyColSize: 'அளவு',
    historyColDate: 'தேதி & நேரம்',
    historyColStatus: 'நிலை',
    historyDeleteRecord: 'பதிவை நீக்கு',
    historyMetadataNote: 'விவரங்கள் மட்டும் · உள்ளடக்கம் சேமிக்கப்படாது',
    statusSuccess: 'முடிந்தது',
    statusWarning: 'குறிப்புடன் முடிந்தது',
    statusError: 'தோல்வி',
    settingsTitle: 'அமைப்புகள் & ஆஃப்லைன் சேமிப்பு',
    settingsSubtitle: 'தோற்றம், மொழி மற்றும் உள்ளூர் உலாவி சேமிப்பை நிர்வகிக்கவும்.',
    settingsAppearance: 'விருப்பத்தேர்வுகள்',
    settingsDataTitle: 'உள்ளூர் சேமிப்பு & தற்காலிக சேமிப்பு',
    settingsClearHistoryBtn: 'மாற்ற வரலாற்றை அழி',
    settingsClearHistoryDesc: 'இந்தச் சாதனத்தில் சேமிக்கப்பட்ட அனைத்து கோப்பு வரலாறுகளையும் நீக்குகிறது.',
    settingsClearCacheBtn: 'தற்காலிக பயன்பாட்டுத் தரவை அழி',
    settingsClearCacheDesc: 'ஆஃப்லைன் Service Worker தற்காலிக சேமிப்பை அழித்து விருப்பங்களை மீட்டமைக்கிறது.',
    settingsClearCacheConfirm: 'ஆஃப்லைன் பயன்பாட்டுத் தரவை அழிக்கவா? சொத்துக்களை மீண்டும் சேமிக்க ஒருமுறை இணைய இணைப்பு தேவைப்படும்.',
    settingsCacheCleared: 'தற்காலிக பயன்பாட்டுத் தரவு அழிக்கப்பட்டது.',
    settingsPrivacyTitle: 'தனியுரிமை & பாதுகாப்பு உத்தரவாதம்',
    settingsPrivacyBody:
      'ஆஃப்லைன் ஆவண மாற்றி அனைத்து PDF, Word மற்றும் பட செயலாக்கங்களையும் உங்கள் சாதனத்தின் நினைவகத்திலேயே WebAssembly மற்றும் JavaScript மூலம் செயல்படுத்துகிறது. எந்தக் கோப்பும் இணையத்தில் அனுப்பப்படுவதில்லை.',
    settingsAboutTitle: 'ஆஃப்லைன் ஆவண மாற்றி பற்றி',
    settingsAboutBody:
      'pdf-lib, jsPDF, pdf.js, mammoth.js, docx மற்றும் JSZip ஆகியவற்றுடன் இணையமின்றி செயல்பட வடிவமைக்கப்பட்ட Progressive Web App.',
    settingsVersionLabel: 'செயலி பதிப்பு',
    settingsInstalledStatus: 'தனி செயலியாக நிறுவப்பட்டது',
    settingsNotInstalledStatus: 'உலாவியில் இயங்குகிறது',
    quickSelectTitle: 'உங்கள் கோப்பிற்கான கருவியைத் தேர்ந்தெடுக்கவும்',
    quickSelectSubtitle: 'தேர்ந்தெடுத்த கோப்பைத் திறக்க விரும்பும் கருவியைக் கிளிக் செய்யவும்.',
    quickSelectChooseTool: 'திற:',
  },
};
