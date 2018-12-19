import { Component } from 'react';

export interface ModelOptions<S> {
	url?: () => string | string;
	parse?: <T>(data: any) => T;
	state?: S;
	fetchOpts?: RequestInit;
}

export class Model<S> {
	private comp: Component;
	private opts: ModelOptions<S>;

	constructor(comp: Component, opts: ModelOptions<S> = {}) {
		this.comp = comp;
		this.opts = opts;

		if (opts.state) {
			this.comp.state = { ...(comp.state || {}), ...opts.state };
		}
	}
}
