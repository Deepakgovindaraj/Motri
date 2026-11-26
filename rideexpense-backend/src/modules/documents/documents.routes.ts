import { NextFunction, Response, Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { Vehicle, VehicleDocument } from '../../models';
import { AppError } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const documentTypeEnum = z.enum([
  'Insurance',
  'Registration',
  'Pollution Certificate',
  'Licence',
  'Warranty',
  'Other',
]);

const createDocumentSchema = z.object({
  vehicleId: objectIdSchema.optional().or(z.literal('')),
  documentType: documentTypeEnum,
  title: z.string().trim().min(2).max(140),
  documentNumber: z.string().trim().max(80).optional(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  fileUrl: z.string().max(1_500_000).optional(),
  fileName: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

const listDocumentsQuerySchema = z.object({
  vehicleId: objectIdSchema.optional(),
  documentType: documentTypeEnum.optional(),
});

const idParamSchema = z.object({ id: objectIdSchema });

const router = Router();
router.use(authenticate);

router.get(
  '/',
  validate({ query: listDocumentsQuerySchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filter: Record<string, unknown> = { userId: req.user!.id };
      if (req.query.vehicleId) filter.vehicleId = req.query.vehicleId;
      if (req.query.documentType) filter.documentType = req.query.documentType;

      const items = await VehicleDocument.find(filter)
        .populate('vehicleId', 'vehicleName registrationNumber vehicleType')
        .sort({ expiryDate: 1, createdAt: -1 });

      sendSuccess(res, items, 'Documents retrieved successfully');
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/',
  validate({ body: createDocumentSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof createDocumentSchema>;
      let vehicleId: mongoose.Types.ObjectId | undefined;
      if (body.vehicleId) {
        const vehicle = await Vehicle.findOne({ _id: body.vehicleId, userId: req.user!.id });
        if (!vehicle) throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
        vehicleId = vehicle._id;
      }

      const created = await VehicleDocument.create({
        userId: req.user!.id,
        vehicleId,
        documentType: body.documentType,
        title: body.title,
        documentNumber: body.documentNumber || undefined,
        issueDate: body.issueDate,
        expiryDate: body.expiryDate,
        fileUrl: body.fileUrl || undefined,
        fileName: body.fileName || undefined,
        notes: body.notes || undefined,
      });

      const populated = await created.populate(
        'vehicleId',
        'vehicleName registrationNumber vehicleType',
      );
      sendSuccess(res, populated, 'Document saved successfully', 201);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/:id',
  validate({ params: idParamSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const deleted = await VehicleDocument.findOneAndDelete({
        _id: String(req.params.id),
        userId: req.user!.id,
      });
      if (!deleted) throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      sendSuccess(res, { deleted: true }, 'Document deleted successfully');
    } catch (error) {
      next(error);
    }
  },
);

export default router;
