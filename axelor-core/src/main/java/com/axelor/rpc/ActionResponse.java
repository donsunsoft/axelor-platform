/**
 * Copyright (c) 2012-2014 Axelor. All Rights Reserved.
 *
 * The contents of this file are subject to the Common Public
 * Attribution License Version 1.0 (the “License”); you may not use
 * this file except in compliance with the License. You may obtain a
 * copy of the License at:
 *
 * http://license.axelor.com/.
 *
 * The License is based on the Mozilla Public License Version 1.1 but
 * Sections 14 and 15 have been added to cover use of software over a
 * computer network and provide for limited attribution for the
 * Original Developer. In addition, Exhibit A has been modified to be
 * consistent with Exhibit B.
 *
 * Software distributed under the License is distributed on an “AS IS”
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 *
 * The Original Code is part of "Axelor Business Suite", developed by
 * Axelor exclusively.
 *
 * The Original Developer is the Initial Developer. The Initial Developer of
 * the Original Code is Axelor.
 *
 * All portions of the code written by Axelor are
 * Copyright (c) 2012-2014 Axelor. All Rights Reserved.
 */
package com.axelor.rpc;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlType;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;

/**
 * An implementation of {@link Response} to be used with controllers.
 * 
 */
@XmlType
@XmlRootElement(name = "response")
public class ActionResponse extends Response {

	final Map<String, Object> _data = Maps.newHashMap();

	@SuppressWarnings("all")
	private void set(String name, Object value) {
		if (getData() == null) {
			List<Object> data = Lists.newArrayList();
			data.add(_data);
			setData(data);
		}
		_data.put(name, value);
	}

	/**
	 * Set the <i>reload</i> flag.
	 * <p>
	 * The client user <i>reload</i> flag to refresh the view.
	 * </p>
	 * 
	 * @param reload
	 *            whether to reload client view
	 */
	public void setReload(boolean reload) {
		set("reload", reload);
	}

	/**
	 * Set a flash message.
	 * <p>
	 * This message will be shown on the client screen.
	 * </p>
	 * 
	 * @param flash
	 *            the message to show on client
	 */
	public void setFlash(String flash) {
		set("flash", flash);
	}

	/**
	 * Set record values.
	 * <p>
	 * The client updates current view with these values.
	 * </p>
	 * 
	 * @param context
	 *            a map or a model instance
	 * @see #setValue(String, Object)
	 */
	public void setValues(Object context) {
		set("values", context);
	}

	/**
	 * Set value for the given field.
	 * 
	 * @param fieldName
	 *            name of the field
	 * @param value
	 *            field name
	 * @see #setValues(Object)
	 */
	@SuppressWarnings("all")
	public void setValue(String fieldName, Object value) {
		Map<String, Object> values = (Map) _data.get("values");
		if (values == null) {
			values = Maps.newHashMap();
		}
		values.put(fieldName, value);
		setValues(values);
	}

	/**
	 * Inform the client to open the given view.
	 * 
	 */
	public void setView(Map<String, Object> view) {
		set("view", view);
	}

	/**
	 * Inform the client to open a view for the given model.
	 * 
	 * @param title
	 *            the view title
	 * @param model
	 *            the model name
	 * @param mode
	 *            the view mode (e.g. form, grid etc)
	 * @param domain
	 *            the filter
	 */
	public void setView(String title, String model, String mode, String domain) {
		Map<String, Object> view = Maps.newHashMap();
		view.put("title", title);
		view.put("model", model);
		view.put("type", mode);
		view.put("domain", domain);
		setView(view);
	}

	/**
	 * Send an arbitrary signal to the client view with the specified data.
	 * 
	 * @param signal
	 *            signal name
	 * @param data
	 *            signal data
	 */
	public void setSignal(String signal, Object data) {
		set("signal", signal);
		set("signal-data", data);
	}

	/**
	 * Set field attributes.
	 * <p>
	 * The client view may update the view fields with the given attributes.
	 * </p>
	 * 
	 * @param attrs
	 *            attribute map for the fields
	 */
	public void setAttrs(Map<String, Map<String, Object>> attrs) {
		set("attrs", attrs);
	}

	/**
	 * Set an attribute of a field.
	 * 
	 * @param fieldName
	 *            name of the field
	 * @param attr
	 *            attribute name
	 * @param value
	 *            attribute value
	 */
	@SuppressWarnings("all")
	public void setAttr(String fieldName, String attr, Object value) {

		Map<String, Map<String, Object>> attrs = null;

		try {
			attrs = (Map) ((Map) getItem(0)).get("attrs");
		} catch (Exception e) {
		}

		if (attrs == null) {
			attrs = new HashMap<String, Map<String, Object>>();
		}

		Map<String, Object> my = attrs.get(fieldName);
		if (my == null) {
			my = new HashMap<String, Object>();
		}

		my.put(attr, value);
		attrs.put(fieldName, my);

		setAttrs(attrs);
	}

	/**
	 * Set the <code>required</code> attribute for the given field.
	 * 
	 * @param fieldName
	 *            name of the field
	 * @param required
	 *            true or false
	 */
	public void setRequired(String fieldName, boolean required) {
		setAttr(fieldName, "required", required);
	}

	/**
	 * Set the <code>readonly</code> attribute for the given field.
	 * 
	 * @param fieldName
	 *            name of the field
	 * @param readonly
	 *            true or false
	 */
	public void setReadonly(String fieldName, boolean readonly) {
		setAttr(fieldName, "readonly", readonly);
	}

	/**
	 * Set the <code>hidden</code> attribute for the given field.
	 * 
	 * @param fieldName
	 *            name of the field
	 * @param hidden
	 *            true or false
	 */
	public void setHidden(String fieldName, boolean hidden) {
		setAttr(fieldName, "hidden", hidden);
	}

	/**
	 * Set the <code>color</code> attribute for the given field.
	 * 
	 * @param fieldName
	 *            name of the field
	 * @param color
	 *            CSS compatible color value
	 */
	public void setColor(String fieldName, String color) {
		setAttr(fieldName, "color", color);
	}
}
