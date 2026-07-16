import { Module } from '@nestjs/common';
import { OrgStructureService } from './org-structure.service';
import { BusinessUnitsController, CostCentersController, GradesController } from './org-structure.controller';

@Module({
  providers: [OrgStructureService],
  controllers: [BusinessUnitsController, GradesController, CostCentersController],
  exports: [OrgStructureService],
})
export class OrgStructureModule {}
