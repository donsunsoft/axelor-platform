/**
 * Copyright (c) 2012-2013 Axelor. All Rights Reserved.
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
 * Copyright (c) 2012-2013 Axelor. All Rights Reserved.
 */
package com.axelor.web;

import groovy.lang.GString;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Map;

import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.ext.ContextResolver;
import javax.ws.rs.ext.Provider;

import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.LocalDateTime;
import org.joda.time.LocalTime;

import com.axelor.db.Model;
import com.axelor.rpc.Resource;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.datatype.guava.GuavaModule;
import com.fasterxml.jackson.datatype.joda.JodaModule;

@Provider
@Produces(MediaType.APPLICATION_JSON)
public class ObjectMapperProvider implements ContextResolver<ObjectMapper> {

	private ObjectMapper mapper;

	static class ModelSerializer extends JsonSerializer<Model> {

		@Override
		public void serialize(Model value, JsonGenerator jgen, SerializerProvider provider)
				throws IOException, JsonProcessingException {
			if (value != null) {
				JsonSerializer<Object> serializer = provider.findValueSerializer(Map.class, null);
				Map<String, Object> map = Resource.toMap(value);
				serializer.serialize(map, jgen, provider);
			}
		}
	}
	
	static class GStringSerializer extends JsonSerializer<GString> {
		
		@Override
		public void serialize(GString value, JsonGenerator jgen, SerializerProvider provider)
				throws IOException, JsonProcessingException {
			if (value != null) {
				jgen.writeString(value.toString());
			}
		}
	}
	
	static class DateTimeSerializer extends JsonSerializer<DateTime> {
		
		@Override
		public void serialize(DateTime value, JsonGenerator jgen,
				SerializerProvider provider) throws IOException,
				JsonProcessingException {
			if (value != null) {
				String text = value.withZone(DateTimeZone.UTC).toString();
				jgen.writeString(text);
			}
		}
	}

	static class LocalDateTimeSerializer extends JsonSerializer<LocalDateTime> {
		
		@Override
		public void serialize(LocalDateTime value, JsonGenerator jgen,
				SerializerProvider provider) throws IOException,
				JsonProcessingException {
			if (value != null) {
				String text = value.toDateTime().withZone(DateTimeZone.UTC).toString();
				jgen.writeString(text);
			}
		}
	}
	
	static class LocalTimeSerializer extends JsonSerializer<LocalTime> {
		
		@Override
		public void serialize(LocalTime value, JsonGenerator jgen,
				SerializerProvider provider) throws IOException,
				JsonProcessingException {
			if (value != null) {
				String text = value.toString("HH:mm");
				jgen.writeString(text);
			}
		}
	}
	
	static class DecimalSerializer extends JsonSerializer<BigDecimal> {
		
		@Override
		public void serialize(BigDecimal value, JsonGenerator jgen,
				SerializerProvider provider) throws IOException,
				JsonProcessingException {
			if (value != null) {
				jgen.writeString(value.toPlainString());
			}
		}
	}
	
	public ObjectMapperProvider() {
		mapper = new ObjectMapper();
		
		mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
		mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

		SimpleModule module = new SimpleModule("MyModule");
		module.addSerializer(Model.class, new ModelSerializer());
		module.addSerializer(GString.class, new GStringSerializer());
		module.addSerializer(BigDecimal.class, new DecimalSerializer());

		JodaModule jodaModule = new JodaModule();
		jodaModule.addSerializer(DateTime.class, new DateTimeSerializer());
		jodaModule.addSerializer(LocalDateTime.class, new LocalDateTimeSerializer());
		jodaModule.addSerializer(LocalTime.class, new LocalTimeSerializer());

		mapper.registerModule(module);
		mapper.registerModule(jodaModule);
		mapper.registerModule(new GuavaModule());
	}
	
	@Override
	public ObjectMapper getContext(Class<?> objectType) {
		return mapper;
	}
}
