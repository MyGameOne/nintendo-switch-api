export class RESTful {
    private defaultOptions: RequestInit;
    constructor(defaultOptions: RequestInit) {
        this.defaultOptions = defaultOptions;
    }
    public post(url: string, data: RequestInit = {}) {
        return RESTful.post(url, { ...this.defaultOptions, ...data });
    }

    public get(url: string, data: RequestInit = {}) {
        return RESTful.get(url, { ...this.defaultOptions, ...data });
    }

    public delete(url: string, data: RequestInit = {}) {
        return RESTful.delete(url, { ...this.defaultOptions, ...data });
    }

    public options(url: string, data: RequestInit = {}) {
        return RESTful.options(url, { ...this.defaultOptions, ...data });
    }

    public put(url: string, data: RequestInit = {}) {
        return RESTful.put(url, { ...this.defaultOptions, ...data });
    }

    static post(url: string, data: RequestInit) {
        return fetch(url, {
            ...data,
            method: 'POST',
        });
    }

    static get(url: string, data: RequestInit) {
        return fetch(url, {
            ...data,
            method: 'GET',
        });
    }

    static delete(url: string, data: RequestInit) {
        return fetch(url, {
            ...data,
            method: 'DELETE',
        });

    }

    static options(url: string, data: RequestInit) {
        return fetch(url, {
            ...data,
            method: 'OPTIONS',
        });
    }

    static put(url: string, data: RequestInit) {
        return fetch(url, {
            ...data,
            method: 'PUT',
        });
    }
}