import { Body, Controller, Delete, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Response } from 'express';
import { DocumentType, PermissionAction } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? './uploads';

@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('employees/:employeeId/documents')
  @RequirePermissions('documents', PermissionAction.CREATE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const dir = join(UPLOAD_ROOT, (req as any).user.organizationId, String(req.params.employeeId));
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: DocumentType,
    @Body('name') name: string,
    @Body('expiryDate') expiryDate?: string,
  ) {
    const relativePath = join(user.organizationId, employeeId, file.filename);
    return this.documents.upload(user, employeeId, type ?? DocumentType.OTHER, name ?? file.originalname, relativePath, expiryDate);
  }

  @Get('employees/:employeeId/documents')
  @RequirePermissions('documents', PermissionAction.VIEW_OWN)
  listForEmployee(@CurrentUser() user: AuthenticatedUser, @Param('employeeId') employeeId: string) {
    return this.documents.listForEmployee(user, employeeId);
  }

  @Get('documents/:id/download')
  @RequirePermissions('documents', PermissionAction.VIEW_OWN)
  async download(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Res() res: Response) {
    const document = await this.documents.get(user, id);
    return res.sendFile(document.fileUrl, { root: UPLOAD_ROOT });
  }

  @Delete('documents/:id')
  @RequirePermissions('documents', PermissionAction.DELETE)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documents.remove(user, id);
  }
}
