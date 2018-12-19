import { Fetch, Parse } from './fetch';

// removed the dependency on react, can be used with anything that uses that interface.
export interface Stater {
	state: any;
	setState: (state: any, cb?: () => void) => void;
}

// options used for the model.
export interface ModelOptions<S> {
	url: (() => string) | string; // required
	parse?: (resp: Response) => Promise<S>; // parse must return the state that will be assigned with setState.

	stateCallback?: () => void; // extra callback to be called to be passed to comp.setState(..., cb);

	beforeFetch?: () => void; // ran before fetch operations.
	afterFetch?: () => void; // ran after fetch operations, may not get called if fetch or parse throws.

	beforeSave?: () => void; // ran before save operations.
	afterSave?: () => void; // ran before save operations, may not get called if fetch or parse throws.

	stateFromSaveResp?: boolean; // if true, setState will be called with the returned data, otherwise it'll be called with the passed data

	method?: string; // should be only used in overrides, defaults to GET on fetch and PUT on save.
	fetchOpts?: RequestInit; // extra options to pass to html5 fetch.
}

export interface State {
	[id: string]: any;
}

export class Model<T extends Stater, S extends State = {}> {
	public loading: boolean = false;

	private comp: T;
	private opts: ModelOptions<S>;
	private pstate: S;

	constructor(comp: T, opts: ModelOptions<S>, state?: S) {
		this.comp = comp;
		this.opts = opts;
		this.pstate = state || ({} as S);

		if (state) {
			// eslint-disable-next-line
			comp.state = { ...this.cstate, model: state };
		}
	}

	get state(): Readonly<S> {
		return { ...this.pstate };
	}

	setState = (state: S, callback?: () => void, loading: boolean = false) => {
		this.comp.setState({ ...this.cstate, model: state }, () => {
			this.loading = loading;
			this.pstate = state;
			if (callback) {
				callback();
			}
		});
	};

	updateState = (state: Partial<S>, callback?: () => void, loading: boolean = false) =>
		this.setState({ ...this.state, ...state }, callback, loading);

	// should be called in `async componentDidMount() { ... }`
	fetch = async (extraOpts?: ModelOptions<S>): Promise<S> => {
		const opts = { ...this.opts, ...extraOpts },
			url = typeof opts.url === 'function' ? opts.url() : opts.url,
			parse = opts.parse || Parse;

		if (typeof url !== 'string') {
			throw new Error('invalid url');
		}

		this.setLoading(true);

		if (opts.beforeFetch) {
			opts.beforeFetch();
		}

		const resp = await Fetch(url, opts.method || 'GET', null, opts.fetchOpts),
			data = await parse(resp);

		if (opts.afterFetch) {
			opts.afterFetch();
		}

		this.updateState(data, opts.stateCallback, false);

		return data;
	};

	save = async (state: S = this.state, extraOpts?: ModelOptions<S>) => {
		const opts = { ...this.opts, ...extraOpts },
			url = typeof opts.url === 'function' ? opts.url() : opts.url,
			parse = opts.parse || Parse;

		if (typeof url !== 'string') {
			throw new Error('invalid url');
		}

		this.setLoading(true);

		if (opts.beforeSave) {
			opts.beforeSave();
		}

		const resp = await Fetch(url, opts.method || 'PUT', state, opts.fetchOpts),
			data = await parse(resp);

		this.updateState(opts.stateFromSaveResp ? data : state, opts.stateCallback);

		if (opts.afterSave) {
			opts.afterSave();
		}

		return data;
	};

	private get cstate(): any {
		return this.comp.state || {};
	}

	private setLoading = (isLoading: boolean = true) =>
		this.comp.setState({ ...this.cstate, loading: isLoading })
}
