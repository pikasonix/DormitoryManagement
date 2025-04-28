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
            res.status(201).json(newBuilding);
        } catch (error) {
            next(error);
        }
    }

    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const buildings = await this.buildingService.getAll(req.query);
            res.json(buildings);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const building = await this.buildingService.getById(Number(req.params.id));
            res.json(building);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const updatedBuilding = await this.buildingService.update(Number(req.params.id), req.body);
            res.json(updatedBuilding);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await this.buildingService.delete(Number(req.params.id));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}