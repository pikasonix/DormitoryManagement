"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingController = void 0;
const typedi_1 = require("typedi");
const building_service_1 = require("../services/building.service");
class BuildingController {
    constructor() {
        this.buildingService = typedi_1.Container.get(building_service_1.BuildingService);
    }
    create(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const newBuilding = yield this.buildingService.create(req.body);
                res.status(201).json({
                    success: true,
                    data: newBuilding
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    getAll(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.buildingService.getAll(req.query);
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
            }
            catch (error) {
                next(error);
            }
        });
    }
    getById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const building = yield this.buildingService.getById(Number(req.params.id));
                res.json({
                    success: true,
                    data: building
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    update(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { building } = yield this.buildingService.update(Number(req.params.id), req.body);
                res.json({
                    success: true,
                    data: building
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    delete(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.buildingService.delete(Number(req.params.id));
                res.json({
                    success: true,
                    message: "Xóa tòa nhà thành công"
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.BuildingController = BuildingController;
