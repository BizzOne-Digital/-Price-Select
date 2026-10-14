import 'server-only'
import { Schema } from 'mongoose'
import { model } from './util'

/** Public catalog/content images, served by /api/uploads/[folder]/[filename]. */
const StoredUploadSchema = new Schema(
  {
    folder: { type: String, required: true, enum: ['products', 'gallery', 'pages', 'misc'] },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedBy: String,
  },
  { timestamps: true },
)
StoredUploadSchema.index({ folder: 1, filename: 1 }, { unique: true })
export const StoredUpload = model('StoredUpload', StoredUploadSchema)

/** Private documents and evidence. Never served by the public image routes. */
const PrivateAssetSchema = new Schema(
  {
    purpose: { type: String, enum: ['supplier_document', 'product_document', 'product_image', 'case_evidence'], required: true },
    label: String,
    originalName: String,
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
    uploadedBy: { type: String, required: true },
    uploaderRole: { type: String, required: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', index: true },
    customerUserId: { type: String, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    case: { type: Schema.Types.ObjectId, ref: 'Case' },
  },
  { timestamps: true },
)
export const PrivateAsset = model('PrivateAsset', PrivateAssetSchema)

/** Chunked upload transport (keeps each request under the host's body limit). */
const UploadSessionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    target: { type: String, enum: ['public', 'private'], required: true },
    folder: String,
    purpose: String,
    label: String,
    originalName: String,
    declaredType: String,
    size: { type: Number, required: true },
    chunkSize: { type: Number, required: true },
    chunkCount: { type: Number, required: true },
    received: { type: [Number], default: [] },
    status: { type: String, enum: ['open', 'finalizing', 'finalized', 'aborted'], default: 'open' },
    result: { url: String, assetId: String, filename: String, size: Number, folder: String },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
)
export const UploadSession = model('UploadSession', UploadSessionSchema)

const UploadChunkSchema = new Schema({
  session: { type: Schema.Types.ObjectId, required: true },
  index: { type: Number, required: true },
  data: { type: Buffer, required: true },
  size: { type: Number, required: true },
})
UploadChunkSchema.index({ session: 1, index: 1 }, { unique: true })
export const UploadChunk = model('UploadChunk', UploadChunkSchema)
