import { Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { BuildingService } from '../services/building.service';

export class BuildingController {
    private readonly buildingService: BuildingService;

    constructor() {
        this.buildingService = Container.get(BuildingService);
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const newBuilding = await this.buildingService.create(req.body);
            res.status(201).json({
                success: true,
                data: newBuilding
            });
        } catch (error) {
            next(error);
        }
    }

    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await this.buildingService.getAll(req.query);
            res.json({
                success: true,
                data: {
                    buildings: result.items,
                    meta: {
                        total: result.total,
                        page: result.page || Number(req.query.page) || 1,
                        limit: result.limit || Number(req.query.limit) || 10,
                        totalPages: result.totalPages || Math.ceil(result.total / (Number(req.query.limit) || 10))
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const building = await this.buildingService.getById(Number(req.params.id));
            res.json({
                success: true,
                data: building
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { building } = await this.buildingService.update(Number(req.params.id), req.body);
            res.json({
                success: true,
                data: building
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await this.buildingService.delete(Number(req.params.id));
            res.json({
                success: true,
                message: "Xóa tòa nhà thành công"
            });
        } catch (error) {
            next(error);
        }
    }
}