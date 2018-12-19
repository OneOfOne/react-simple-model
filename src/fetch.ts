export const DefaultHeaders = {
	'Accept': 'application/json',
	'Content-Type': 'application/json',
};

export class FetchError extends Error {
	public status: number;
	public statusText: string;
	public data: any;

	constructor(status: number, text: string, data: any) {
		super(text);

		// @ts-ignore
		if (Error.captureStackTrace) {
			// @ts-ignore
			Error.captureStackTrace(this, FetchError);
		}

		this.status = status;
		this.statusText = text;
		this.data = data;
	}
}

export async function Parse<T>(resp: Response): Promise<T> {
	const ct = resp.headers.get('Content-Type'),
		isJSON = !!ct && ct.startsWith('application/json'),
		data = isJSON ? ((await resp.json()) as T) : await resp.text();

	if (resp.status > 299) {
		throw new FetchError(resp.status, resp.statusText, data);
	}

	return data as T;
}

export async function Fetch(
	url: string,
	method: string = 'GET',
	payload: any = null,
	opts: RequestInit = {},
): Promise<any> {
	// performs api calls sending the required authentication headers
	const req: RequestInit = {
		method: method || 'GET',
		...opts,
	};

	if (!req.headers) {
		req.headers = { ...DefaultHeaders };
	}

	if (payload instanceof FormData || payload instanceof Blob) {
		req.body = payload;
	} else if (typeof payload === 'string') {
		req.body = payload;
	} else if (typeof payload === 'function') {
		req.body = payload(req);
	} else if (payload != null) {
		req.body = JSON.stringify(payload);
	}

	return fetch(url, req);
}
