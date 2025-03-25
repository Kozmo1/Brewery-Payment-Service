import { PaymentController } from "../paymentController";
import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import axios from "axios";
import { validationResult, ValidationError } from "express-validator";

// Mock axios for API calls
jest.mock("axios", () => ({
	get: jest.fn(),
	post: jest.fn(),
}));

// Mock express-validator
jest.mock("express-validator", () => ({
	validationResult: jest.fn(),
}));

// Type the mocked validationResult to match its expected return
const mockedValidationResult =
	validationResult as unknown as jest.MockedFunction<
		() => {
			isEmpty: () => boolean;
			array: () => ValidationError[];
		}
	>;

describe("PaymentController", () => {
	let paymentController: PaymentController;
	let mockRequest: Partial<AuthRequest>;
	let mockResponse: Partial<Response>;
	let mockNext: jest.Mock;

	// Set up fresh controller and mocks before each test
	beforeEach(() => {
		paymentController = new PaymentController();
		mockRequest = {
			body: {},
			params: {},
			headers: { authorization: "Bearer mock-token" },
			user: { id: 1, email: "test@example.com" },
		};
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		mockNext = jest.fn();

		// Clear mocks for isolation
		jest.clearAllMocks();
		// Quiet down console logs during tests
		jest.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("processPayment", () => {
		// Test a successful payment process
		it("should process payment successfully", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			(axios.get as jest.Mock).mockResolvedValueOnce({
				data: { UserId: 1 },
			});
			(axios.post as jest.Mock).mockResolvedValue({
				data: {
					Id: 1,
					OrderId: 101,
					Amount: 19.99,
					Status: "Completed",
				},
			});

			mockRequest.body = { orderId: 101, amount: 19.99 };

			await paymentController.processPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(axios.post).toHaveBeenCalledWith(
				"http://localhost:5089/api/payment/process",
				{ OrderId: 101, Amount: 19.99, Status: "Pending" },
				expect.any(Object)
			);
			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Payment processed successfully",
				payment: {
					Id: 1,
					OrderId: 101,
					Amount: 19.99,
					Status: "Completed",
				},
			});
		});

		// Test validation failure
		it("should return 400 if validation fails", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => false,
				array: () => [
					{
						msg: "Order ID must be a positive integer",
					} as ValidationError,
				],
			});

			mockRequest.body = { orderId: "invalid", amount: -5 };

			await paymentController.processPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				errors: [{ msg: "Order ID must be a positive integer" }],
			});
		});

		// Test unauthorized user
		it("should return 403 if user is unauthorized", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			(axios.get as jest.Mock).mockResolvedValue({
				data: { UserId: 2 }, // Different from req.user.id (1)
			});

			mockRequest.body = { orderId: 101, amount: 19.99 };

			await paymentController.processPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test req.user undefined
		it("should return 403 if req.user is undefined", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			mockRequest.user = undefined;

			mockRequest.body = { orderId: 101, amount: 19.99 };

			await paymentController.processPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test error without response
		it("should handle errors without response", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			(axios.get as jest.Mock).mockRejectedValue(
				new Error("Network error")
			);

			mockRequest.body = { orderId: 101, amount: 19.99 };

			await paymentController.processPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error processing payment",
				error: "Network error",
			});
		});

		// Test partial error response with errors field
		it("should handle partial error response with errors", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			(axios.get as jest.Mock).mockRejectedValue({
				response: { status: 400, data: { errors: "Invalid order" } },
			});

			mockRequest.body = { orderId: 101, amount: 19.99 };

			await paymentController.processPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error processing payment",
				error: "Invalid order",
			});
		});
	});

	describe("getPaymentStatus", () => {
		// Test successful status retrieval
		it("should get payment status successfully", async () => {
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({
					data: {
						Id: 1,
						OrderId: 101,
						Amount: 19.99,
						Status: "Completed",
					},
				})
				.mockResolvedValueOnce({ data: { UserId: 1 } });

			mockRequest.params = { paymentId: "1" };

			await paymentController.getPaymentStatus(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(axios.get).toHaveBeenCalledWith(
				"http://localhost:5089/api/payment/1",
				expect.any(Object)
			);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				Id: 1,
				OrderId: 101,
				Amount: 19.99,
				Status: "Completed",
			});
		});

		// Test unauthorized user
		it("should return 403 if user is unauthorized", async () => {
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({
					data: {
						Id: 1,
						OrderId: 101,
						Amount: 19.99,
						Status: "Completed",
					},
				})
				.mockResolvedValueOnce({ data: { UserId: 2 } });

			mockRequest.params = { paymentId: "1" };

			await paymentController.getPaymentStatus(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test req.user undefined - Fixed to expect 403
		it("should return 403 if req.user is undefined", async () => {
			mockRequest.user = undefined;
			mockRequest.params = { paymentId: "1" };

			await paymentController.getPaymentStatus(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
			expect(axios.get).not.toHaveBeenCalled(); // Shouldn’t hit API
		});

		// Test payment not found
		it("should handle payment not found", async () => {
			(axios.get as jest.Mock).mockRejectedValue({
				response: {
					status: 404,
					data: { message: "Payment not found" },
				},
			});

			mockRequest.params = { paymentId: "1" };

			await paymentController.getPaymentStatus(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Payment not found",
				error: undefined,
			});
		});

		// Test error without response
		it("should handle errors without response", async () => {
			(axios.get as jest.Mock).mockRejectedValue(
				new Error("Network error")
			);

			mockRequest.params = { paymentId: "1" };

			await paymentController.getPaymentStatus(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Payment not found",
				error: "Network error",
			});
		});

		// Test partial error response with errors field
		it("should handle partial error response with errors", async () => {
			(axios.get as jest.Mock).mockRejectedValue({
				response: { status: 400, data: { errors: "Invalid payment" } },
			});

			mockRequest.params = { paymentId: "1" };

			await paymentController.getPaymentStatus(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Payment not found",
				error: "Invalid payment",
			});
		});
	});

	describe("refundPayment", () => {
		// Test successful refund
		it("should process refund successfully", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({
					data: {
						Id: 1,
						OrderId: 101,
						Amount: 19.99,
						Status: "Completed",
					},
				})
				.mockResolvedValueOnce({ data: { UserId: 1 } });
			(axios.post as jest.Mock).mockResolvedValue({
				data: {
					Id: 1,
					OrderId: 101,
					Amount: 19.99,
					Status: "Refunded",
				},
			});

			mockRequest.params = { paymentId: "1" };
			mockRequest.body = { amount: 19.99 };

			await paymentController.refundPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(axios.post).toHaveBeenCalledWith(
				"http://localhost:5089/api/payment/refund/1",
				{ Amount: 19.99 },
				expect.any(Object)
			);
			expect(mockResponse.status).toHaveBeenCalledWith(200);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Refund processed successfully",
				refund: {
					Id: 1,
					OrderId: 101,
					Amount: 19.99,
					Status: "Refunded",
				},
			});
		});

		// Test validation failure
		it("should return 400 if validation fails", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => false,
				array: () => [
					{
						msg: "Amount must be a positive number",
					} as ValidationError,
				],
			});

			mockRequest.params = { paymentId: "1" };
			mockRequest.body = { amount: -5 };

			await paymentController.refundPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				errors: [{ msg: "Amount must be a positive number" }],
			});
		});

		// Test unauthorized user
		it("should return 403 if user is unauthorized", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			(axios.get as jest.Mock)
				.mockResolvedValueOnce({
					data: {
						Id: 1,
						OrderId: 101,
						Amount: 19.99,
						Status: "Completed",
					},
				})
				.mockResolvedValueOnce({ data: { UserId: 2 } });

			mockRequest.params = { paymentId: "1" };
			mockRequest.body = { amount: 19.99 };

			await paymentController.refundPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
		});

		// Test req.user undefined - Fixed to expect 403
		it("should return 403 if req.user is undefined", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			mockRequest.user = undefined;
			mockRequest.params = { paymentId: "1" };
			mockRequest.body = { amount: 19.99 };

			await paymentController.refundPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Unauthorized",
			});
			expect(axios.get).not.toHaveBeenCalled(); // Shouldn’t hit API
		});

		// Test error without response
		it("should handle errors without response", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			(axios.get as jest.Mock).mockRejectedValue(
				new Error("Network error")
			);

			mockRequest.params = { paymentId: "1" };
			mockRequest.body = { amount: 19.99 };

			await paymentController.refundPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error processing refund",
				error: "Network error",
			});
		});

		// Test partial error response
		it("should handle partial error response", async () => {
			mockedValidationResult.mockReturnValue({
				isEmpty: () => true,
				array: () => [],
			});
			(axios.get as jest.Mock).mockRejectedValue({
				response: { status: 400, data: {} },
			});

			mockRequest.params = { paymentId: "1" };
			mockRequest.body = { amount: 19.99 };

			await paymentController.refundPayment(
				mockRequest as AuthRequest,
				mockResponse as Response,
				mockNext
			);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Error processing refund",
				error: undefined,
			});
		});
	});
});
