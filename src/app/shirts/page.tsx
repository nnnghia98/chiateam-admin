'use client';

import type { ChangeEvent } from 'react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  ImageUp,
  Plus,
  Shirt,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

interface ShirtEntry {
  id: string;
  playerName: string;
  shirtNumber: string | null;
  shirtSize: string;
  shirtName: string;
}

interface ShirtSample {
  id: string;
  imageName: string;
  imageDataUrl: string;
}

const STORAGE_KEY = 'chiateam-shirt-registration';
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface XlsxPart {
  path: string;
  data: Uint8Array;
}

interface SampleImageExport {
  sample: ShirtSample;
  bytes: Uint8Array;
  extension: 'png' | 'jpg' | 'gif';
  mime: 'image/png' | 'image/jpeg' | 'image/gif';
  widthPx: number;
  heightPx: number;
}

function createId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createEntry(): ShirtEntry {
  return {
    id: createId('shirt-row'),
    playerName: '',
    shirtNumber: null,
    shirtSize: '',
    shirtName: '',
  };
}

function createInitialEntries(): ShirtEntry[] {
  return [1, 2, 3].map(index => ({
    id: `shirt-row-${index}`,
    playerName: '',
    shirtNumber: null,
    shirtSize: '',
    shirtName: '',
  }));
}

function normalizeEntries(value: unknown): ShirtEntry[] {
  if (!Array.isArray(value)) return createInitialEntries();

  const entries = value.map(item => {
    const record =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};

    return {
      id: typeof record.id === 'string' ? record.id : createEntry().id,
      playerName:
        typeof record.playerName === 'string' ? record.playerName : '',
      shirtNumber:
        typeof record.shirtNumber === 'string'
          ? record.shirtNumber || null
          : null,
      shirtSize: typeof record.shirtSize === 'string' ? record.shirtSize : '',
      shirtName: typeof record.shirtName === 'string' ? record.shirtName : '',
    };
  });

  return entries.length > 0 ? entries : createInitialEntries();
}

function normalizeSamples(value: unknown): ShirtSample[] {
  if (Array.isArray(value)) {
    return value
      .map(item => {
        const record =
          item && typeof item === 'object'
            ? (item as Record<string, unknown>)
            : {};

        return {
          id: typeof record.id === 'string' ? record.id : createId('sample'),
          imageName:
            typeof record.imageName === 'string' ? record.imageName : '',
          imageDataUrl:
            typeof record.imageDataUrl === 'string'
              ? record.imageDataUrl
              : '',
        };
      })
      .filter(sample => sample.imageDataUrl);
  }

  const record =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const imageName = typeof record.imageName === 'string' ? record.imageName : '';
  const imageDataUrl =
    typeof record.imageDataUrl === 'string' ? record.imageDataUrl : '';

  return imageDataUrl
    ? [
        {
          id: typeof record.id === 'string' ? record.id : createId('sample'),
          imageName,
          imageDataUrl,
        },
      ]
    : [];
}

function escapeXml(value: string) {
  return value
    .replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textBytes(value: string) {
  return new TextEncoder().encode(value);
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach(chunk => {
    output.set(chunk, offset);
    offset += chunk.length;
  });

  return output;
}

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;

  for (let index = 0; index < data.length; index += 1) {
    crc = crcTable[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

function createStoredZip(parts: XlsxPart[]) {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  parts.forEach(part => {
    const nameBytes = textBytes(part.path);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    const crc = crc32(part.data);

    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, part.data.length);
    writeUint32(localView, 22, part.data.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, part.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);

    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, part.data.length);
    writeUint32(centralView, 24, part.data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + part.data.length;
  });

  const centralDirectory = concatBytes(centralChunks);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);

  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, parts.length);
  writeUint16(endView, 10, parts.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);

  return concatBytes([...localChunks, centralDirectory, end]);
}

function dataUrlToBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);

  if (!match) return null;

  const [, mime, base64Marker, payload] = match;
  const binary = base64Marker ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return {
    bytes,
    mime: mime.toLowerCase(),
  };
}

function getSampleImageSize(dataUrl: string) {
  return new Promise<{ width: number; height: number }>(resolve => {
    const image = new window.Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth || 240,
        height: image.naturalHeight || 180,
      });
    };
    image.onerror = () => {
      resolve({ width: 240, height: 180 });
    };
    image.src = dataUrl;
  });
}

async function prepareSampleImage(
  sample: ShirtSample
): Promise<SampleImageExport | null> {
  if (!sample.imageDataUrl) return null;

  const image = dataUrlToBytes(sample.imageDataUrl);

  if (!image) return null;

  const imageType =
    image.mime === 'image/png'
      ? { extension: 'png' as const, mime: 'image/png' as const }
      : image.mime === 'image/jpeg' || image.mime === 'image/jpg'
        ? { extension: 'jpg' as const, mime: 'image/jpeg' as const }
        : image.mime === 'image/gif'
          ? { extension: 'gif' as const, mime: 'image/gif' as const }
          : null;

  if (!imageType) return null;

  const dimensions = await getSampleImageSize(sample.imageDataUrl);
  const maxWidth = 220;
  const maxHeight = 160;
  const scale = Math.min(
    maxWidth / dimensions.width,
    maxHeight / dimensions.height,
    1
  );

  return {
    sample,
    bytes: image.bytes,
    extension: imageType.extension,
    mime: imageType.mime,
    widthPx: Math.max(1, Math.round(dimensions.width * scale)),
    heightPx: Math.max(1, Math.round(dimensions.height * scale)),
  };
}

async function prepareSampleImages(samples: ShirtSample[]) {
  const images = await Promise.all(
    samples.map(sample => prepareSampleImage(sample))
  );

  return images.filter((image): image is SampleImageExport => image !== null);
}

function xlsxCell(
  cell: string,
  value: string | number | null,
  style = 1,
  asText = true
) {
  const styleAttribute = style ? ` s="${style}"` : '';

  if (value === null || value === '') {
    return `<c r="${cell}"${styleAttribute}/>`;
  }

  if (typeof value === 'number' && !asText) {
    return `<c r="${cell}"${styleAttribute}><v>${value}</v></c>`;
  }

  return `<c r="${cell}"${styleAttribute} t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
}

function xlsxRow(index: number, cells: string[], height?: number) {
  const heightAttributes = height ? ` ht="${height}" customHeight="1"` : '';

  return `<row r="${index}"${heightAttributes}>${cells.join('')}</row>`;
}

function createWorksheetXml(
  entries: ShirtEntry[],
  samples: ShirtSample[],
  images: SampleImageExport[]
) {
  const sampleRows = Math.max(samples.length, 1);
  const registrationsTitleRow = sampleRows + 4;
  const headerRow = registrationsTitleRow + 1;
  const tableStartRow = headerRow + 1;
  const lastRow = tableStartRow + entries.length - 1;
  const sampleXmlRows =
    samples.length > 0
      ? samples.map((sample, index) =>
          xlsxRow(
            index + 2,
            [
              xlsxCell(`A${index + 2}`, `Sample ${index + 1}`, 4),
              xlsxCell(`B${index + 2}`, sample.imageName),
              xlsxCell(`C${index + 2}`, null),
              xlsxCell(`D${index + 2}`, null),
              xlsxCell(`E${index + 2}`, null),
            ],
            122
          )
        )
      : [
          xlsxRow(2, [
            xlsxCell('A2', 'Samples', 4),
            xlsxCell('B2', 'No sample images attached.'),
            xlsxCell('C2', null),
            xlsxCell('D2', null),
            xlsxCell('E2', null),
          ]),
        ];
  const rows = [
    xlsxRow(1, [xlsxCell('A1', 'Sample shirts', 3)]),
    ...sampleXmlRows,
    xlsxRow(registrationsTitleRow, [
      xlsxCell(`A${registrationsTitleRow}`, 'Shirt registrations', 3),
    ]),
    xlsxRow(headerRow, [
      xlsxCell(`A${headerRow}`, '#', 2),
      xlsxCell(`B${headerRow}`, 'Player name *', 2),
      xlsxCell(`C${headerRow}`, 'Size *', 2),
      xlsxCell(`D${headerRow}`, 'Number', 2),
      xlsxCell(`E${headerRow}`, 'Name on shirt', 2),
    ]),
    ...entries.map((entry, index) =>
      xlsxRow(tableStartRow + index, [
        xlsxCell(`A${tableStartRow + index}`, index + 1, 1, false),
        xlsxCell(`B${tableStartRow + index}`, entry.playerName),
        xlsxCell(`C${tableStartRow + index}`, entry.shirtSize),
        xlsxCell(`D${tableStartRow + index}`, entry.shirtNumber ?? ''),
        xlsxCell(`E${tableStartRow + index}`, entry.shirtName),
      ])
    ),
  ].join('');
  const mergeCells = [
    '<mergeCell ref="A1:E1"/>',
    ...Array.from(
      { length: sampleRows },
      (_, index) => `<mergeCell ref="B${index + 2}:E${index + 2}"/>`
    ),
    `<mergeCell ref="A${registrationsTitleRow}:E${registrationsTitleRow}"/>`,
  ].join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:E${lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="${headerRow}" topLeftCell="A${tableStartRow}" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="8" customWidth="1"/>
    <col min="2" max="2" width="30" customWidth="1"/>
    <col min="3" max="3" width="14" customWidth="1"/>
    <col min="4" max="4" width="20" customWidth="1"/>
    <col min="5" max="5" width="24" customWidth="1"/>
  </cols>
  <sheetData>${rows}</sheetData>
  <mergeCells count="${sampleRows + 2}">${mergeCells}</mergeCells>
  ${images.length > 0 ? '<drawing r:id="rId1"/>' : ''}
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function createContentTypesXml(images: SampleImageExport[]) {
  const imageDefaults = Array.from(
    new Map(images.map(image => [image.extension, image.mime]))
  )
    .map(
      ([extension, mime]) =>
        `<Default Extension="${extension}" ContentType="${mime}"/>`
    )
    .join('');
  const drawingOverride = images.length
    ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
    : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${imageDefaults}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${drawingOverride}
</Types>`;
}

function createStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><color rgb="FF222222"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FF222222"/><name val="Arial"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF222222"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFF385C"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD9D9D9"/></left>
      <right style="thin"><color rgb="FFD9D9D9"/></right>
      <top style="thin"><color rgb="FFD9D9D9"/></top>
      <bottom style="thin"><color rgb="FFD9D9D9"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function createDrawingXml(images: SampleImageExport[]) {
  const emuPerPixel = 9525;
  const anchors = images
    .map(
      (image, index) => `
  <xdr:oneCellAnchor>
    <xdr:from>
      <xdr:col>1</xdr:col>
      <xdr:colOff>0</xdr:colOff>
      <xdr:row>${index + 1}</xdr:row>
      <xdr:rowOff>0</xdr:rowOff>
    </xdr:from>
    <xdr:ext cx="${image.widthPx * emuPerPixel}" cy="${image.heightPx * emuPerPixel}"/>
    <xdr:pic>
      <xdr:nvPicPr>
        <xdr:cNvPr id="${index + 1}" name="Sample shirt ${index + 1}"/>
        <xdr:cNvPicPr/>
      </xdr:nvPicPr>
      <xdr:blipFill>
        <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId${index + 1}"/>
        <a:stretch><a:fillRect/></a:stretch>
      </xdr:blipFill>
      <xdr:spPr>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      </xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
${anchors}
</xdr:wsDr>`;
}

async function createXlsxBlob(entries: ShirtEntry[], samples: ShirtSample[]) {
  const images = await prepareSampleImages(samples);

  if (samples.length !== images.length) {
    throw new Error('UNSUPPORTED_SAMPLE_IMAGE');
  }

  const parts: XlsxPart[] = [
    {
      path: '[Content_Types].xml',
      data: textBytes(createContentTypesXml(images)),
    },
    {
      path: '_rels/.rels',
      data: textBytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      path: 'xl/workbook.xml',
      data: textBytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Registration" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`),
    },
    {
      path: 'xl/_rels/workbook.xml.rels',
      data: textBytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
    {
      path: 'xl/styles.xml',
      data: textBytes(createStylesXml()),
    },
    {
      path: 'xl/worksheets/sheet1.xml',
      data: textBytes(createWorksheetXml(entries, samples, images)),
    },
  ];

  if (images.length) {
    parts.push(
      {
        path: 'xl/worksheets/_rels/sheet1.xml.rels',
        data: textBytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`),
      },
      {
        path: 'xl/drawings/drawing1.xml',
        data: textBytes(createDrawingXml(images)),
      },
      {
        path: 'xl/drawings/_rels/drawing1.xml.rels',
        data: textBytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${images
    .map(
      (image, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${index + 1}.${image.extension}"/>`
    )
    .join('')}
</Relationships>`),
      },
      ...images.map((image, index) => ({
        path: `xl/media/image${index + 1}.${image.extension}`,
        data: image.bytes,
      }))
    );
  }

  return new Blob([createStoredZip(parts)], { type: XLSX_MIME });
}

function rowHasAnyValue(entry: ShirtEntry) {
  return Boolean(
    entry.playerName.trim() ||
      entry.shirtSize.trim() ||
      entry.shirtNumber?.trim() ||
      entry.shirtName.trim()
  );
}

function rowHasRequiredValues(entry: ShirtEntry) {
  return Boolean(entry.playerName.trim() && entry.shirtSize.trim());
}

async function downloadExcel(entries: ShirtEntry[], samples: ShirtSample[]) {
  const rows = entries.filter(
    entry => rowHasAnyValue(entry)
  );

  if (rows.length === 0) {
    alert('Add at least one shirt row before exporting.');
    return;
  }

  if (rows.some(entry => !rowHasRequiredValues(entry))) {
    alert('Player name and size are required for every filled row.');
    return;
  }

  let blob: Blob;

  try {
    blob = await createXlsxBlob(rows, samples);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNSUPPORTED_SAMPLE_IMAGE') {
      alert('Excel export supports PNG, JPG, or GIF sample images.');
      return;
    }

    alert('Could not create the Excel file. Please try again.');
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chiateam-shirt-registration-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function RequiredAsterisk() {
  return (
    <span aria-hidden="true" className="text-[#ff385c]">
      *
    </span>
  );
}

export default function ShirtsPage() {
  const { canEdit } = useAuth();
  const [entries, setEntries] =
    useState<ShirtEntry[]>(createInitialEntries);
  const [samples, setSamples] = useState<ShirtSample[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState('Draft');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;

        if (Array.isArray(parsed)) {
          setEntries(normalizeEntries(parsed));
        } else if (parsed && typeof parsed === 'object') {
          const draft = parsed as Record<string, unknown>;
          setEntries(normalizeEntries(draft.entries));
          setSamples(normalizeSamples(draft.samples ?? draft.sample));
        }
      }
    } catch (error) {
      console.error('Failed to load shirt registration draft:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, samples }));
      setSaveState('Saved');
    } catch (error) {
      console.error('Failed to save shirt registration draft:', error);
      setSaveState('Image too large');
    }
  }, [entries, samples, loaded]);

  const filledRows = useMemo(
    () =>
      entries.filter(
        entry => rowHasRequiredValues(entry)
      ),
    [entries]
  );

  const updateEntry = (
    id: string,
    field: 'playerName' | 'shirtNumber' | 'shirtSize' | 'shirtName',
    value: string
  ) => {
    setEntries(current =>
      current.map(entry =>
        entry.id === id
          ? {
              ...entry,
              [field]:
                field === 'shirtNumber'
                  ? value.replace(/[^\d]/g, '') || null
                  : value,
            }
          : entry
      )
    );
    setSaveState('Draft');
  };

  const attachSampleImage = (event: ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;

    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) return;

    const invalidFile = files.find(
      file => !['image/png', 'image/jpeg', 'image/gif'].includes(file.type)
    );

    if (invalidFile) {
      alert('Please attach a PNG, JPG, or GIF image.');
      return;
    }

    Promise.all(
      files.map(
        file =>
          new Promise<ShirtSample>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: createId('sample'),
                imageName: file.name,
                imageDataUrl:
                  typeof reader.result === 'string' ? reader.result : '',
              });
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    )
      .then(newSamples => {
        setSamples(current => [
          ...current,
          ...newSamples.filter(sample => sample.imageDataUrl),
        ]);
        setSaveState('Draft');
      })
      .catch(() => {
        alert('Could not read one of the sample images.');
      });
  };

  const removeSampleImage = (id: string) => {
    if (!canEdit) return;

    setSamples(current => current.filter(sample => sample.id !== id));
    setSaveState('Draft');
  };

  const addRow = () => {
    setEntries(current => [...current, createEntry()]);
    setSaveState('Draft');
  };

  const removeRow = (id: string) => {
    if (!canEdit) return;

    setEntries(current => {
      if (current.length === 1) {
        return [createEntry()];
      }

      return current.filter(entry => entry.id !== id);
    });
    setSaveState('Draft');
  };

  const clearRows = () => {
    if (!canEdit) return;
    if (!confirm('Clear the shirt registration sheet?')) return;
    setEntries(createInitialEntries());
    setSaveState('Draft');
  };

  return (
    <div className="space-y-5">
      <section className="rounded-airbnb border border-[#e7e7e7] bg-white shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#1c1c1e]">
        <div className="grid gap-0 overflow-hidden rounded-airbnb lg:grid-cols-[1fr_320px]">
          <div className="p-5 sm:p-6">
            <div className="mb-5 inline-flex items-center gap-2 rounded-airbnb border border-[#ffd1d8] bg-design-active px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-design-primary-strong dark:border-[#5a1a27]">
              <Shirt className="h-3.5 w-3.5" />
              Shirt order
            </div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight text-[#222222] dark:text-[#f5f5f5] sm:text-5xl">
                  Registration sheet
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Required player names and sizes, plus numbers, printed shirt
                  names, and shared sample shirt references.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearRows}
                    className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => void downloadExcel(entries, samples)}
                  className="rounded-airbnb bg-[#222222] text-white hover:bg-[#ff385c] dark:bg-[#ff385c] dark:hover:bg-[#e00b41]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-[#f2f2f2] bg-[#fcfbf8] p-5 dark:border-[#2e2e2e] dark:bg-[#151515] lg:border-l lg:border-t-0">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Rows
                </p>
                <p className="mt-2 text-3xl font-black text-[#222222] dark:text-[#f5f5f5]">
                  {entries.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Filled
                </p>
                <p className="mt-2 text-3xl font-black text-[#222222] dark:text-[#f5f5f5]">
                  {filledRows.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Sample
                </p>
                <p className="mt-2 text-lg font-black text-[#222222] dark:text-[#f5f5f5]">
                  {samples.length ? samples.length : 'Missing'}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-airbnb border border-[#e7e7e7] bg-white px-3 py-2 text-sm font-medium text-[#6a6a6a] dark:border-[#2e2e2e] dark:bg-[#1c1c1e] dark:text-[#a3a3a3]">
              <FileSpreadsheet className="h-4 w-4 text-[#ff385c]" />
              {saveState}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-airbnb border border-[#e7e7e7] bg-white shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#1c1c1e]">
        <div className="grid gap-0 overflow-hidden rounded-airbnb lg:grid-cols-[minmax(360px,560px)_1fr]">
          <div className="min-h-[440px] bg-[#fcfbf8] p-5 dark:bg-[#151515]">
            {samples.length > 0 ? (
              <div className="grid gap-3">
                <div className="relative flex h-[360px] items-center justify-center overflow-hidden rounded-airbnb border border-[#e7e7e7] bg-white dark:border-[#2e2e2e] dark:bg-[#111111]">
                  <Image
                    src={samples[0].imageDataUrl}
                    alt="Primary shirt sample"
                    fill
                    sizes="(min-width: 1024px) 520px, 100vw"
                    unoptimized
                    className="object-contain"
                  />
                </div>
                {samples.length > 1 && (
                  <div className="grid grid-cols-3 gap-2">
                    {samples.slice(1).map((sample, index) => (
                      <div
                        key={sample.id}
                        className="relative flex h-32 items-center justify-center overflow-hidden rounded-airbnb border border-[#e7e7e7] bg-white dark:border-[#2e2e2e] dark:bg-[#111111]"
                      >
                        <Image
                          src={sample.imageDataUrl}
                          alt={`Additional shirt sample ${index + 2}`}
                          fill
                          sizes="160px"
                          unoptimized
                          className="object-contain"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[360px] items-center justify-center rounded-airbnb border border-dashed border-[#c1c1c1] bg-white dark:border-[#2e2e2e] dark:bg-[#111111]">
                <Shirt className="h-16 w-16 text-[#c1c1c1]" />
              </div>
            )}
          </div>
          <div className="border-t border-[#f2f2f2] p-5 dark:border-[#2e2e2e] lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
              Samples
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#222222] dark:text-[#f5f5f5]">
              Shirt references
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6a6a6a] dark:text-[#a3a3a3]">
              Shirt samples will be included at the top of the exported Excel
              file.
            </p>

            {canEdit && (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Label
                  htmlFor="sample-shirt-image"
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-airbnb border border-[#c1c1c1] bg-white px-4 text-sm font-medium text-[#222222] transition-all hover:border-[#222222] hover:shadow-airbnb-hover dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                >
                  <ImageUp className="mr-2 h-4 w-4" />
                  Attach samples
                </Label>
                <input
                  id="sample-shirt-image"
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  multiple
                  className="hidden"
                  onChange={attachSampleImage}
                />
              </div>
            )}

            <div className="mt-4 space-y-2">
              {samples.length > 0 ? (
                samples.map((sample, index) => (
                  <div
                    key={sample.id}
                    className="flex items-center justify-between gap-3 rounded-airbnb border border-[#e7e7e7] bg-[#fcfbf8] px-3 py-2 dark:border-[#2e2e2e] dark:bg-[#151515]"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-[#222222] dark:text-[#f5f5f5]">
                      {index + 1}. {sample.imageName}
                    </p>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSampleImage(sample.id)}
                        className="h-8 flex-shrink-0 rounded-airbnb px-2 text-[#6a6a6a] hover:text-[#ff385c] dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a]"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm font-medium text-[#6a6a6a] dark:text-[#a3a3a3]">
                  No samples attached
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-airbnb border border-[#e7e7e7] bg-white shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#1c1c1e]">
        <div className="flex flex-col gap-3 border-b border-[#f2f2f2] px-5 py-4 dark:border-[#2e2e2e] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
              Sheet
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#222222] dark:text-[#f5f5f5]">
              Shirt registrations
            </h2>
          </div>
          <Button
            type="button"
            onClick={addRow}
            className="rounded-airbnb bg-[#222222] text-white hover:bg-[#ff385c] dark:bg-[#ff385c] dark:hover:bg-[#e00b41]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add row
          </Button>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-[#f2f2f2] bg-[#fcfbf8] text-left dark:border-[#2e2e2e] dark:bg-[#151515]">
                <th className="w-16 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  #
                </th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Player name <RequiredAsterisk />
                </th>
                <th className="w-36 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Size <RequiredAsterisk />
                </th>
                <th className="w-40 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Number
                </th>
                <th className="w-56 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Name on shirt
                </th>
                {canEdit && <th className="w-20 px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className="border-b border-[#f2f2f2] last:border-b-0 dark:border-[#2e2e2e]"
                >
                  <td className="px-5 py-4 align-middle text-sm font-bold text-[#6a6a6a] dark:text-[#a3a3a3]">
                    {index + 1}
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <Label htmlFor={`player-${entry.id}`} className="sr-only">
                      Player name required
                    </Label>
                    <Input
                      id={`player-${entry.id}`}
                      required
                      value={entry.playerName}
                      onChange={event =>
                        updateEntry(entry.id, 'playerName', event.target.value)
                      }
                      placeholder="Player name"
                      className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                    />
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <Label htmlFor={`size-${entry.id}`} className="sr-only">
                      Size required
                    </Label>
                    <Input
                      id={`size-${entry.id}`}
                      required
                      value={entry.shirtSize}
                      onChange={event =>
                        updateEntry(entry.id, 'shirtSize', event.target.value)
                      }
                      placeholder="M"
                      className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                    />
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <Label htmlFor={`number-${entry.id}`} className="sr-only">
                      Number
                    </Label>
                    <Input
                      id={`number-${entry.id}`}
                      inputMode="numeric"
                      value={entry.shirtNumber ?? ''}
                      onChange={event =>
                        updateEntry(
                          entry.id,
                          'shirtNumber',
                          event.target.value
                        )
                      }
                      placeholder="Number"
                      className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                    />
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <Label
                      htmlFor={`shirt-name-${entry.id}`}
                      className="sr-only"
                    >
                      Name on shirt
                    </Label>
                    <Input
                      id={`shirt-name-${entry.id}`}
                      value={entry.shirtName}
                      onChange={event =>
                        updateEntry(entry.id, 'shirtName', event.target.value)
                      }
                      placeholder="Printed name"
                      className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                    />
                  </td>
                  {canEdit && (
                    <td className="px-5 py-4 text-right align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(entry.id)}
                        aria-label="Delete row"
                        className="text-[#6a6a6a] hover:text-[#c13515] dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="rounded-airbnb border border-[#e7e7e7] bg-white p-4 dark:border-[#2e2e2e] dark:bg-[#151515]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Row {index + 1}
                </span>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(entry.id)}
                    aria-label="Delete row"
                    className="h-8 w-8 text-[#6a6a6a] hover:text-[#c13515] dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor={`mobile-player-${entry.id}`}
                    className="dark:text-[#f5f5f5]"
                  >
                    Player name <RequiredAsterisk />
                  </Label>
                  <Input
                    id={`mobile-player-${entry.id}`}
                    required
                    value={entry.playerName}
                    onChange={event =>
                      updateEntry(entry.id, 'playerName', event.target.value)
                    }
                    placeholder="Player name"
                    className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor={`mobile-size-${entry.id}`}
                    className="dark:text-[#f5f5f5]"
                  >
                    Size <RequiredAsterisk />
                  </Label>
                  <Input
                    id={`mobile-size-${entry.id}`}
                    required
                    value={entry.shirtSize}
                    onChange={event =>
                      updateEntry(entry.id, 'shirtSize', event.target.value)
                    }
                    placeholder="M"
                    className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor={`mobile-number-${entry.id}`}
                    className="dark:text-[#f5f5f5]"
                  >
                    Number
                  </Label>
                  <Input
                    id={`mobile-number-${entry.id}`}
                    inputMode="numeric"
                    value={entry.shirtNumber ?? ''}
                    onChange={event =>
                      updateEntry(entry.id, 'shirtNumber', event.target.value)
                    }
                    placeholder="Number"
                    className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor={`mobile-shirt-name-${entry.id}`}
                    className="dark:text-[#f5f5f5]"
                  >
                    Name on shirt
                  </Label>
                  <Input
                    id={`mobile-shirt-name-${entry.id}`}
                    value={entry.shirtName}
                    onChange={event =>
                      updateEntry(entry.id, 'shirtName', event.target.value)
                    }
                    placeholder="Printed name"
                    className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
