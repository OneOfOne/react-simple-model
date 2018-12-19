import { Component } from 'react';
import { Fetch, Parse } from './fetch';

export interface ModelOptions<S> {
	url?: () => string | string;
	parse?: (resp: Response) => Promise<S>; // parse must return the state that will be assigned with setState

	stateCallback?: () => void;

	beforeFetch?: () => void;
	afterFetch?: () => void; // may not get called if fetch or parse throws.

	beforeSave?: () => void;
	afterSave?: () => void; // may not get called if fetch or parse throws.

	stateFromSaveResp?: boolean; // if true, setState will be called with the returned data, otherwise it'll be called with the passed data

	method?: string; // should be only used in overrides
	fetchOpts?: RequestInit;
}

export interface State {
	[id: string]: any;
}

export class Model<S extends State = {}> {
	private comp: Component;
	private opts: ModelOptions<S>;
	private pstate: S;

	constructor(comp: Component<any, any>, state?: S, opts?: ModelOptions<S>) {
		this.comp = comp;
		this.opts = opts || {};
		this.pstate = state || ({} as S);

		if (state) {
			this.comp.state = { ...(comp.state || {}), loading: false, model: state };
		}
	}

	get state(): Readonly<S> {
		return this.pstate;
	}

	setState = (state: S, callback?: () => void) => {
		this.comp.setState({ ...this.cstate, model: state }, () => {
			this.pstate = state;
			if (callback) {
				callback();
			}
		});
	};

	updateState = (state: Partial<S>, callback?: () => void) =>
		this.setState({ ...this.state, ...state }, callback);

	// should be called in `async componentDidMount() { ... }`
	fetch = async (extraOpts: ModelOptions<S> = {}): Promise<S> => {
		const opts = { ...this.opts, ...extraOpts },
			url = typeof opts.url === 'function' ? opts.url() : opts.url,
			parse = opts.parse || Parse;

		if (typeof url !== 'string') {
			throw new Error('invalid url');
		}

		if (opts.beforeFetch) {
			opts.beforeFetch();
		}

		const resp = await Fetch(url, opts.method || 'GET', null, opts.fetchOpts),
			data = await parse(resp);

		if (opts.afterFetch) {
			opts.afterFetch();
		}

		this.updateState(data, opts.stateCallback);

		return data;
	};

	save = async (state = this.state, extraOpts: ModelOptions<S> = {}) => {
		const opts = { ...this.opts, ...extraOpts },
			url = typeof opts.url === 'function' ? opts.url() : opts.url,
			parse = opts.parse || Parse;

		if (typeof url !== 'string') {
			throw new Error('invalid url');
		}

		if (opts.beforeSave) {
			opts.beforeSave();
		}

		const resp = await Fetch(url, opts.method || 'GET', state, opts.fetchOpts),
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
