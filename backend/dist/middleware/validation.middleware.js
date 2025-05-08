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
exports.validate = void 0;
const zod_1 = require("zod");
// Middleware factory for Zod schema validation
const validate = (schema) => {
    return (req, _res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Validate request data against provided schema
            yield schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // Format validation errors
                const formattedErrors = error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message
                }));
                const validationError = new Error("Dữ liệu không hợp lệ.");
                validationError.statusCode = 400;
                validationError.errors = formattedErrors;
                validationError.isValidationError = true;
                next(validationError);
            }
            else {
                next(error);
            }
        }
    });
};
exports.validate = validate;
